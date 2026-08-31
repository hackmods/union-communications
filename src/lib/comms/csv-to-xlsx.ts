import { downloadBlob } from "@/lib/export/image-export";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

/** Fetch a public CSV and download as .xlsx (Excel-friendly for stewards). */
export async function downloadCsvAsXlsx(
  csvHref: string,
  basename: string,
): Promise<void> {
  const res = await fetch(csvHref);
  if (!res.ok) {
    throw new Error(`Could not load spreadsheet template (${res.status})`);
  }
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("Spreadsheet template is empty");
  }

  const excelMod = await import("exceljs");
  const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
  const wb = new ExcelNS.Workbook();
  const sheet = wb.addWorksheet("Sheet1");
  for (const row of rows) {
    sheet.addRow(row);
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const safeBase = basename.replace(/\.csv$/i, "");
  await downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeBase}.xlsx`,
  );
}
