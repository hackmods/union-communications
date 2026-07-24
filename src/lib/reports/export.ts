/**
 * Client-side report exports (CSV / XLSX / PDF) over ReportsSummary.
 * Heavy libs are dynamic-imported.
 */

import { downloadBlob } from "@/lib/export/image-export";
import type { ReportsSummary } from "@/lib/reports/aggregate";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function csvEscape(value: string | number): string {
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Flat CSV suitable for parent-union ingest. */
export function reportsSummaryToCsv(summary: ReportsSummary): string {
  const lines: string[] = [
    "section,metric,key,value",
    `meta,from,,${csvEscape(summary.from)}`,
    `meta,to,,${csvEscape(summary.to)}`,
    `grievances,total,,${summary.grievances.total}`,
  ];
  for (const row of summary.grievances.byStatus) {
    lines.push(`grievances,status,${csvEscape(row.key)},${row.count}`);
  }
  for (const row of summary.grievances.byStep) {
    lines.push(`grievances,step,${csvEscape(row.key)},${row.count}`);
  }
  for (const row of summary.grievances.byCategory) {
    lines.push(`grievances,category,${csvEscape(row.key)},${row.count}`);
  }
  lines.push(`bumping,total,,${summary.bumping.total}`);
  for (const row of summary.bumping.byStatus) {
    lines.push(`bumping,status,${csvEscape(row.key)},${row.count}`);
  }
  lines.push(`time,total_hours,,${summary.time.totalHours}`);
  lines.push(`time,entry_count,,${summary.time.entryCount}`);
  for (const row of summary.time.byCategory) {
    lines.push(`time,category_hours,${csvEscape(row.key)},${row.hours}`);
  }
  return lines.join("\n");
}

export async function exportReportsCsv(
  summary: ReportsSummary,
  filename = "unionops-report.csv",
): Promise<void> {
  const csv = reportsSummaryToCsv(summary);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export async function renderReportsXlsx(
  summary: ReportsSummary,
): Promise<Blob> {
  const excelMod = await import("exceljs");
  const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
  const workbook = new ExcelNS.Workbook();
  workbook.creator = "UnionOps";

  const overview = workbook.addWorksheet("Overview");
  overview.addRow(["From", summary.from]);
  overview.addRow(["To", summary.to]);
  overview.addRow([]);
  overview.addRow(["Grievances total", summary.grievances.total]);
  overview.addRow(["Bumping cases total", summary.bumping.total]);
  overview.addRow(["Union-business hours", summary.time.totalHours]);
  overview.addRow(["Union-business entries", summary.time.entryCount]);

  const grev = workbook.addWorksheet("Grievances");
  grev.addRow(["Dimension", "Key", "Count"]);
  for (const row of summary.grievances.byStatus) {
    grev.addRow(["status", row.key, row.count]);
  }
  for (const row of summary.grievances.byStep) {
    grev.addRow(["step", row.key, row.count]);
  }
  for (const row of summary.grievances.byCategory) {
    grev.addRow(["category", row.key, row.count]);
  }

  const bump = workbook.addWorksheet("Bumping");
  bump.addRow(["Status", "Count"]);
  for (const row of summary.bumping.byStatus) {
    bump.addRow([row.key, row.count]);
  }

  const time = workbook.addWorksheet("Union business hours");
  time.addRow(["Category", "Hours"]);
  for (const row of summary.time.byCategory) {
    time.addRow([row.key, row.hours]);
  }

  const out = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(out)], { type: XLSX_MIME });
}

export async function exportReportsXlsx(
  summary: ReportsSummary,
  filename = "unionops-report.xlsx",
): Promise<void> {
  downloadBlob(await renderReportsXlsx(summary), filename);
}

/** Simple text PDF handout for membership meetings. */
export async function exportReportsPdf(
  summary: ReportsSummary,
  filename = "unionops-report.pdf",
  title = "Officer Hub report",
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;
  const line = (text: string, opts?: { bold?: boolean; size?: number }) => {
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(opts?.size ?? 11);
    const lines = pdf.splitTextToSize(text, 612 - margin * 2) as string[];
    for (const l of lines) {
      if (y > 720) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(l, margin, y);
      y += (opts?.size ?? 11) + 4;
    }
  };

  line(title, { bold: true, size: 16 });
  line(`Period: ${summary.from} → ${summary.to}`, { size: 10 });
  y += 8;

  line("Grievances", { bold: true, size: 13 });
  line(`Total filed in range: ${summary.grievances.total}`);
  for (const row of summary.grievances.byStatus) {
    line(`  Status ${row.key}: ${row.count}`);
  }
  for (const row of summary.grievances.byStep) {
    line(`  Step ${row.key}: ${row.count}`);
  }
  for (const row of summary.grievances.byCategory) {
    line(`  Category ${row.key}: ${row.count}`);
  }
  y += 6;

  line("Bumping cases", { bold: true, size: 13 });
  line(`Total opened in range: ${summary.bumping.total}`);
  for (const row of summary.bumping.byStatus) {
    line(`  Status ${row.key}: ${row.count}`);
  }
  y += 6;

  line("Union-business hours", { bold: true, size: 13 });
  line(`Total hours: ${summary.time.totalHours}`);
  line(`Entries: ${summary.time.entryCount}`);
  for (const row of summary.time.byCategory) {
    line(`  ${row.key}: ${row.hours} h`);
  }

  downloadBlob(pdf.output("blob"), filename);
}
