import type { TimeEntry } from "@/types/time";

export function entryDurationHours(entry: TimeEntry): number {
  if (!entry.clockOutAt) return 0;
  const ms =
    new Date(entry.clockOutAt).getTime() - new Date(entry.clockInAt).getTime();
  return Math.max(0, ms / 3_600_000);
}

export function rollupByWorker(entries: TimeEntry[]): Array<{
  workerId: string;
  workerName: string;
  hours: number;
  entries: number;
}> {
  const map = new Map<
    string,
    { workerId: string; workerName: string; hours: number; entries: number }
  >();
  for (const e of entries) {
    const cur = map.get(e.workerId) ?? {
      workerId: e.workerId,
      workerName: e.workerName,
      hours: 0,
      entries: 0,
    };
    cur.hours += entryDurationHours(e);
    cur.entries += 1;
    map.set(e.workerId, cur);
  }
  return [...map.values()].sort((a, b) => b.hours - a.hours);
}

export function rollupByCategory(entries: TimeEntry[]): Array<{
  category: string;
  hours: number;
  entries: number;
}> {
  const map = new Map<string, { category: string; hours: number; entries: number }>();
  for (const e of entries) {
    const cur = map.get(e.category) ?? {
      category: e.category,
      hours: 0,
      entries: 0,
    };
    cur.hours += entryDurationHours(e);
    cur.entries += 1;
    map.set(e.category, cur);
  }
  return [...map.values()].sort((a, b) => b.hours - a.hours);
}

export async function buildTimeExportXlsx(entries: TimeEntry[]): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UnionOps";

  const detail = workbook.addWorksheet("Entries");
  detail.columns = [
    { header: "Worker", key: "worker", width: 24 },
    { header: "Category", key: "category", width: 14 },
    { header: "Job code", key: "job", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Source", key: "source", width: 14 },
    { header: "Clock in", key: "in", width: 22 },
    { header: "Clock out", key: "out", width: 22 },
    { header: "Hours", key: "hours", width: 10 },
    { header: "Notes", key: "notes", width: 32 },
  ];
  for (const e of entries) {
    detail.addRow({
      worker: e.workerName,
      category: e.category,
      job: e.jobCodeLabel,
      status: e.status,
      source: e.entrySource,
      in: e.clockInAt,
      out: e.clockOutAt ?? "",
      hours: Number(entryDurationHours(e).toFixed(2)),
      notes: e.notes ?? "",
    });
  }

  const byWorker = workbook.addWorksheet("By worker");
  byWorker.columns = [
    { header: "Worker", key: "worker", width: 24 },
    { header: "Hours", key: "hours", width: 10 },
    { header: "Entries", key: "entries", width: 10 },
  ];
  for (const row of rollupByWorker(entries)) {
    byWorker.addRow({
      worker: row.workerName,
      hours: Number(row.hours.toFixed(2)),
      entries: row.entries,
    });
  }

  const byCategory = workbook.addWorksheet("By category");
  byCategory.columns = [
    { header: "Category", key: "category", width: 16 },
    { header: "Hours", key: "hours", width: 10 },
    { header: "Entries", key: "entries", width: 10 },
  ];
  for (const row of rollupByCategory(entries)) {
    byCategory.addRow({
      category: row.category,
      hours: Number(row.hours.toFixed(2)),
      entries: row.entries,
    });
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildTimeExportPdf(entries: TimeEntry[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const totalHours = entries.reduce((sum, e) => sum + entryDurationHours(e), 0);
  const lines = [
    "UNIONOPS — TIME ROLLUP",
    "======================",
    `Entries: ${entries.length}`,
    `Total hours: ${totalHours.toFixed(1)}`,
    "",
    "BY WORKER",
    "---------",
    ...rollupByWorker(entries).map(
      (r) => `${r.workerName}: ${r.hours.toFixed(1)}h (${r.entries})`,
    ),
    "",
    "BY CATEGORY",
    "-----------",
    ...rollupByCategory(entries).map(
      (r) => `${r.category}: ${r.hours.toFixed(1)}h (${r.entries})`,
    ),
  ];

  let y = 16;
  for (const line of lines) {
    if (y > 280) {
      pdf.addPage();
      y = 16;
    }
    pdf.setFontSize(10);
    pdf.text(line, 14, y);
    y += 6;
  }
  return pdf.output("blob");
}
