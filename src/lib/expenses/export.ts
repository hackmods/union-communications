import type { ExpenseSubmission } from "@/types/expenses";
import { sumLineItems } from "./totals";

function downloadSafeName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 80);
}

export function expenseExportFilename(
  submission: ExpenseSubmission,
  ext: "xlsx" | "pdf" | "zip",
): string {
  return `${downloadSafeName(submission.title)}-expense.${ext}`;
}

export async function buildExpenseExportXlsx(
  submission: ExpenseSubmission,
): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "UnionOps";
  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Union business expense submission"]);
  summary.addRow(["Title", submission.title]);
  summary.addRow(["Purpose", submission.purpose]);
  summary.addRow(["Submitted by", submission.submittedByName]);
  summary.addRow(["Status", submission.status]);
  summary.addRow(["Total", submission.totalAmount]);
  summary.addRow([]);
  summary.addRow([
    "Note",
    "Prepare for your parent union’s expense system. UnionOps does not integrate with SAP/ERP.",
  ]);

  const lines = wb.addWorksheet("Line items");
  lines.addRow(["Date", "Category", "Description", "Amount"]);
  for (const item of submission.lineItems) {
    lines.addRow([item.date, item.category, item.description, item.amount]);
  }
  lines.addRow([]);
  lines.addRow(["Total", "", "", sumLineItems(submission.lineItems)]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildExpenseExportPdf(
  submission: ExpenseSubmission,
): Promise<Blob> {
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
  line("Union business expense submission");
  line(`Title: ${submission.title}`);
  line(`Purpose: ${submission.purpose}`);
  line(`Submitted by: ${submission.submittedByName}`);
  line(`Status: ${submission.status}`);
  line(`Total: ${submission.totalAmount.toFixed(2)}`);
  line("");
  line("Line items:");
  for (const item of submission.lineItems) {
    line(
      `${item.date} | ${item.category} | ${item.description} | ${item.amount.toFixed(2)}`,
    );
  }
  line("");
  line(
    "Hand this package to your parent union’s expense system. UnionOps does not connect to SAP/ERP.",
  );
  return doc.output("blob");
}

export async function buildExpenseReceiptZip(opts: {
  submission: ExpenseSubmission;
  xlsxBuffer: Buffer;
  pdfBuffer: Buffer;
}): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const { attachmentStore } = await import("@/lib/attachments/store");
  const zip = new JSZip();
  zip.file(
    expenseExportFilename(opts.submission, "xlsx"),
    opts.xlsxBuffer,
  );
  zip.file(expenseExportFilename(opts.submission, "pdf"), opts.pdfBuffer);

  const attachments = await attachmentStore.listForExpenseSubmission(
    opts.submission.id,
  );
  const receipts = zip.folder("receipts");
  if (receipts) {
    for (const att of attachments) {
      const bytes = await attachmentStore.readBytes(att.storageKey);
      if (bytes) {
        receipts.file(att.fileName, bytes);
      }
    }
  }

  zip.file(
    "README.txt",
    [
      "UnionOps union business expense package",
      "",
      `Title: ${opts.submission.title}`,
      `Total: ${opts.submission.totalAmount.toFixed(2)}`,
      attachments.length
        ? `${attachments.length} receipt(s) in receipts/`
        : "No receipt attachments yet.",
      "",
      "Hand this package to your parent union’s expense system.",
    ].join("\n"),
  );

  return zip.generateAsync({ type: "blob" });
}
