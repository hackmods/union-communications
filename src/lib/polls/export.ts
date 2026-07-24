import type { PollAggregates, PollDefinition } from "@/types/polls";

/** CSV/XLSX export of poll aggregates + optional raw free-text rows. */
export async function buildPollResultsXlsx(opts: {
  poll: PollDefinition;
  aggregates: PollAggregates;
}): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "UnionOps";

  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Pulse poll results"]);
  summary.addRow(["Title", opts.poll.title]);
  summary.addRow(["Slug", opts.poll.slug]);
  summary.addRow(["Status", opts.poll.status]);
  summary.addRow(["Responses", opts.aggregates.responseCount]);
  summary.addRow([]);
  summary.addRow([
    "Note",
    "Responses are anonymous. IP addresses are never stored — only a one-way hash for abuse limiting.",
  ]);

  for (const q of opts.aggregates.questions) {
    const sheetName = q.text.slice(0, 28).replace(/[\\/*?:[\]]/g, "_") || q.questionId;
    const ws = wb.addWorksheet(sheetName);
    ws.addRow(["Question", q.text]);
    ws.addRow(["Type", q.type]);
    ws.addRow([]);
    if (q.type === "single_choice" && q.optionCounts) {
      ws.addRow(["Option", "Count"]);
      for (const [opt, count] of Object.entries(q.optionCounts)) {
        ws.addRow([opt, count]);
      }
    } else {
      ws.addRow(["Free-text answers"]);
      for (const line of q.freeText ?? []) {
        ws.addRow([line]);
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildPollResultsCsv(opts: {
  poll: PollDefinition;
  aggregates: PollAggregates;
}): Promise<string> {
  const lines: string[] = [
    "question_id,question_text,type,value,count",
  ];
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  for (const q of opts.aggregates.questions) {
    if (q.type === "single_choice" && q.optionCounts) {
      for (const [opt, count] of Object.entries(q.optionCounts)) {
        lines.push(
          [esc(q.questionId), esc(q.text), q.type, esc(opt), String(count)].join(
            ",",
          ),
        );
      }
    } else {
      for (const line of q.freeText ?? []) {
        lines.push(
          [esc(q.questionId), esc(q.text), q.type, esc(line), "1"].join(","),
        );
      }
    }
  }
  return lines.join("\n");
}
