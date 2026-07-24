import type {
  CashAdvance,
  ExpenseClaim,
  TravelAuthorization,
} from "@/types/travel";
import {
  estimatedTotal,
  reconcileDifference,
  sumLineItems,
} from "@/lib/travel/reconcile";

function downloadSafeName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 80);
}

/** Build an itemized XLSX workbook buffer for parent-union expense handoff. */
export async function buildTravelExportXlsx(opts: {
  auth: TravelAuthorization;
  advance: CashAdvance | null;
  claim: ExpenseClaim | null;
}): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "UnionOps";
  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Travel authorization export"]);
  summary.addRow(["Event", opts.auth.eventName]);
  summary.addRow(["Purpose", opts.auth.purpose]);
  summary.addRow([
    "Dates",
    `${opts.auth.eventStartDate} – ${opts.auth.eventEndDate}`,
  ]);
  summary.addRow(["Requested by", opts.auth.requestedByName]);
  summary.addRow(["Status", opts.auth.status]);
  summary.addRow([
    "Estimated total",
    estimatedTotal(opts.auth.estimatedCosts),
  ]);
  summary.addRow(["Advance", opts.advance?.amount ?? 0]);
  if (opts.claim) {
    summary.addRow(["Claim status", opts.claim.status]);
    summary.addRow(["Actual spend", sumLineItems(opts.claim.lineItems)]);
    const diff =
      opts.claim.difference ??
      reconcileDifference(opts.claim.lineItems, opts.claim.advanceAmount);
    summary.addRow(["Difference (spend − advance)", diff]);
  }
  summary.addRow([]);
  summary.addRow([
    "Note",
    "Prepare for your parent union’s expense system. UnionOps does not integrate with SAP/ERP.",
  ]);

  const est = wb.addWorksheet("Estimated costs");
  est.addRow(["Category", "Amount"]);
  for (const [cat, amount] of Object.entries(opts.auth.estimatedCosts)) {
    est.addRow([cat, amount]);
  }

  if (opts.claim) {
    const lines = wb.addWorksheet("Actual expenses");
    lines.addRow(["Date", "Category", "Description", "Amount"]);
    for (const item of opts.claim.lineItems) {
      lines.addRow([item.date, item.category, item.description, item.amount]);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Simple text PDF via jsPDF for the same package. */
export async function buildTravelExportPdf(opts: {
  auth: TravelAuthorization;
  advance: CashAdvance | null;
  claim: ExpenseClaim | null;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 14;
  const line = (text: string) => {
    doc.text(text, 14, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 14;
    }
  };
  line("Travel authorization — expense package");
  line(`Event: ${opts.auth.eventName}`);
  line(`Purpose: ${opts.auth.purpose}`);
  line(`Dates: ${opts.auth.eventStartDate} – ${opts.auth.eventEndDate}`);
  line(`Requested by: ${opts.auth.requestedByName}`);
  line(`Status: ${opts.auth.status}`);
  line(`Estimated total: ${estimatedTotal(opts.auth.estimatedCosts).toFixed(2)}`);
  line(`Cash advance: ${(opts.advance?.amount ?? 0).toFixed(2)}`);
  if (opts.claim) {
    line(`Claim status: ${opts.claim.status}`);
    line(`Actual spend: ${sumLineItems(opts.claim.lineItems).toFixed(2)}`);
    const diff =
      opts.claim.difference ??
      reconcileDifference(opts.claim.lineItems, opts.claim.advanceAmount);
    line(`Difference (spend − advance): ${diff.toFixed(2)}`);
    line("");
    line("Line items:");
    for (const item of opts.claim.lineItems) {
      line(
        `  ${item.date} | ${item.category} | ${item.description} | ${item.amount.toFixed(2)}`,
      );
    }
  }
  line("");
  line(
    "Export Receipt ZIP from the Hub to bundle scanned receipts with this report.",
  );
  line(
    "UnionOps prepares this package only — it does not connect to SAP/ERP systems.",
  );
  return doc.output("blob");
}

export function travelExportFilename(
  auth: TravelAuthorization,
  ext: "xlsx" | "pdf" | "zip",
): string {
  return `travel-${downloadSafeName(auth.eventName)}-${auth.id.slice(0, 8)}.${ext}`;
}

/**
 * Expense handoff ZIP: report buffers (xlsx/pdf) plus receipt files under receipts/.
 * Only includes attachments with scanStatus clean or skipped_dev.
 */
export async function buildReceiptZip(opts: {
  auth: TravelAuthorization;
  claim: ExpenseClaim | null;
  xlsxBuffer?: Buffer | null;
  pdfBuffer?: Buffer | null;
}): Promise<Blob> {
  const { isDownloadAllowed } = await import("@/lib/attachments/scan");
  const { attachmentStore } = await import("@/lib/attachments/store");
  const { getObjectStorage } = await import("@/lib/attachments/storage");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const base = downloadSafeName(opts.auth.eventName) || "travel";
  const shortId = opts.auth.id.slice(0, 8);

  if (opts.xlsxBuffer?.length) {
    zip.file(`${base}-${shortId}.xlsx`, opts.xlsxBuffer);
  }
  if (opts.pdfBuffer?.length) {
    zip.file(`${base}-${shortId}.pdf`, opts.pdfBuffer);
  }

  const receiptNames: string[] = [];
  if (opts.claim) {
    const attachments = await attachmentStore.listForExpenseClaim(opts.claim.id);
    const storage = getObjectStorage();
    const usedNames = new Set<string>();
    for (const att of attachments) {
      if (!isDownloadAllowed(att.scanStatus)) continue;
      const bytes = await storage.get(att.storageKey);
      if (!bytes?.length) continue;
      let name = downloadSafeName(att.fileName) || att.id;
      if (usedNames.has(name)) {
        const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
        const stem = ext ? name.slice(0, -ext.length) : name;
        name = `${stem}-${att.id.slice(0, 6)}${ext}`;
      }
      usedNames.add(name);
      zip.file(`receipts/${name}`, bytes);
      receiptNames.push(name);
    }
  }

  zip.file(
    "README.txt",
    [
      "UnionOps travel expense package",
      `Authorization: ${opts.auth.id}`,
      `Event: ${opts.auth.eventName}`,
      opts.claim
        ? `Claim: ${opts.claim.id} (${opts.claim.lineItems.length} line items)`
        : "No expense claim yet.",
      `Receipts included: ${receiptNames.length}`,
      ...receiptNames.map((n) => `  - receipts/${n}`),
      "",
      "Hand this package to your parent union’s expense system.",
      "UnionOps does not integrate with SAP/ERP.",
    ].join("\n"),
  );

  return zip.generateAsync({ type: "blob" });
}
