import type { ParsedTable } from "./types";

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 50_000;
export const MAX_IMPORT_COLUMNS = 200;
export const MAX_EXPANDED_BYTES = 250 * 1024 * 1024;

function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.length === 0) {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error("A quoted CSV field is not closed.");
  if (row.length > 0 || cell.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

function tableFromMatrix(matrix: string[][], sheetName: string): ParsedTable {
  if (matrix.length < 2) throw new Error("Add a header row and at least one data row.");
  if (matrix.length - 1 > MAX_IMPORT_ROWS) throw new Error("This file has more than 50,000 data rows.");
  const headers = matrix[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  if (!headers.length || headers.length > MAX_IMPORT_COLUMNS) throw new Error("Use between 1 and 200 columns.");
  if (headers.some((h) => !h)) throw new Error("Every column needs a header.");
  const normalized = headers.map((h) => h.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new Error("Column headers must be unique.");
  if (matrix.slice(1).some((row) => row.length > headers.length)) throw new Error("A data row contains values beyond the header columns.");
  return {
    sheetName,
    headers,
    rows: matrix.slice(1).map((cells) => Object.fromEntries(headers.map((h, index) => [h, cells[index] ?? ""]))),
  };
}

function inspectXlsxArchive(bytes: Buffer) {
  const minimumEocdSize = 22;
  const searchStart = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let offset = bytes.length - minimumEocdSize; offset >= searchStart; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("This XLSX file has an invalid ZIP directory.");
  const disk = bytes.readUInt16LE(eocd + 4);
  const directoryDisk = bytes.readUInt16LE(eocd + 6);
  const entriesOnDisk = bytes.readUInt16LE(eocd + 8);
  const entries = bytes.readUInt16LE(eocd + 10);
  const directorySize = bytes.readUInt32LE(eocd + 12);
  const directoryOffset = bytes.readUInt32LE(eocd + 16);
  if (disk !== 0 || directoryDisk !== 0 || entriesOnDisk !== entries || entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    throw new Error("Multi-part or ZIP64 workbooks are not accepted.");
  }
  if (entries > 20_000 || directoryOffset + directorySize > eocd) throw new Error("This XLSX file has an invalid or oversized ZIP directory.");
  let offset = directoryOffset;
  let expandedBytes = 0;
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error("This XLSX file has an invalid ZIP directory.");
    const flags = bytes.readUInt16LE(offset + 8);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length) throw new Error("This XLSX file has an invalid ZIP directory.");
    if (flags & 1) throw new Error("Encrypted workbooks are not accepted.");
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength).replace(/\\/g, "/");
    if (/^xl\/externallinks\//i.test(name) || /(?:^|\/)vbaProject\.bin$/i.test(name)) throw new Error("Workbooks with macros or external links are not accepted.");
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error("The expanded workbook is larger than 250 MiB.");
    offset = end;
  }
  if (offset !== directoryOffset + directorySize) throw new Error("This XLSX file has an invalid ZIP directory.");
}

export async function parseUploadedTable(fileName: string, bytes: Buffer): Promise<ParsedTable> {
  if (bytes.length === 0 || bytes.length > MAX_IMPORT_BYTES) throw new Error("Choose a non-empty CSV or XLSX file under 25 MiB.");
  if (/\.xlsm$/i.test(fileName)) throw new Error("Macro-enabled workbooks are not accepted.");
  if (/\.csv$/i.test(fileName)) {
    if (bytes.includes(0)) throw new Error("This CSV contains binary data.");
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Save the CSV as UTF-8, then try again.");
    }
    return tableFromMatrix(parseCsvRecords(text), "CSV");
  }
  if (!/\.xlsx$/i.test(fileName) || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("Choose a valid .csv or .xlsx file.");
  }
  inspectXlsxArchive(bytes);

  const excelModule = await import("exceljs");
  const Excel = (excelModule.default ?? excelModule) as typeof import("exceljs");
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(bytes as never);
  const model = workbook.model as unknown as { externalLinks?: unknown[] };
  if (model.externalLinks?.length) throw new Error("Workbooks with external links are not accepted.");
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no worksheet.");
  const matrix: string[][] = [];
  let expandedBytes = 0;
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > MAX_IMPORT_COLUMNS) throw new Error("Use no more than 200 columns.");
      const raw = cell.value;
      if (raw && typeof raw === "object" && ("formula" in raw || "sharedFormula" in raw)) {
        throw new Error(`Remove the formula in row ${row.number}, column ${col}; values only are accepted.`);
      }
      const value = raw == null ? "" : raw instanceof Date ? raw.toISOString().slice(0, 10) : typeof raw === "object" ? "" : String(raw);
      expandedBytes += Buffer.byteLength(value, "utf8");
      if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error("The expanded worksheet is larger than 250 MiB.");
      cells[col - 1] = value;
    });
    matrix.push(cells);
    if (matrix.length > MAX_IMPORT_ROWS + 1) throw new Error("This file has more than 50,000 data rows.");
  });
  return tableFromMatrix(matrix, sheet.name);
}
