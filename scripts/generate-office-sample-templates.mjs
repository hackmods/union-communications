/**
 * Generate pristine Office baselines under public/templates/office/.
 * Run: node scripts/generate-office-sample-templates.mjs
 *
 * Colour toggles fetch discrete files (e.g. simple-letter_red.docx).
 * Letterhead regions include {%logo} for docxtemplater-image-module-free.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import PizZip from "pizzip";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docxDir = path.join(root, "public", "templates", "office", "docx");
const xlsxDir = path.join(root, "public", "templates", "office", "xlsx");

fs.mkdirSync(docxDir, { recursive: true });
fs.mkdirSync(xlsxDir, { recursive: true });

const COLORS = {
  brand: { fill: "003366", ink: "FFFFFF", label: "Brand" },
  red: { fill: "9E1B32", ink: "FFFFFF", label: "Red" },
  blue: { fill: "1B4F72", ink: "FFFFFF", label: "Blue" },
};

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="120" w:after="200"/></w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="200" w:after="120"/></w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
</w:styles>`;

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function p(text, opts = {}) {
  const style = opts.style ? `<w:pStyle w:val="${opts.style}"/>` : "";
  const spacing = opts.after
    ? `<w:spacing w:after="${opts.after}"/>`
    : `<w:spacing w:after="120"/>`;
  const shd = opts.fill
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>`
    : "";
  const bold = opts.bold ? "<w:b/>" : "";
  const color = opts.color ? `<w:color w:val="${opts.color}"/>` : "";
  const size = opts.size ? `<w:sz w:val="${opts.size}"/>` : "";
  const fonts = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`;
  return `<w:p>
  <w:pPr>${style}${spacing}${shd}</w:pPr>
  <w:r><w:rPr>${fonts}${bold}${color}${size}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>
</w:p>`;
}

function emptyP(after = 120) {
  return `<w:p><w:pPr><w:spacing w:after="${after}"/></w:pPr></w:p>`;
}

function letterheadBlock(fill, ink) {
  return [
    p("{%logo}", { after: 80 }),
    p("Local {localNumber}", {
      fill,
      color: ink,
      bold: true,
      size: "28",
      after: 60,
    }),
    p("{contactName}", {
      fill,
      color: ink,
      size: "20",
      after: 200,
    }),
  ];
}

function sectPr() {
  // Letter page, ~1" margins
  return `<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1008" w:right="1008" w:bottom="1008" w:left="1008" w:header="720" w:footer="720"/>
</w:sectPr>`;
}

function writeDocx(filename, paragraphs) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n")}
    ${sectPr()}
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rels);
  zip.file("word/_rels/document.xml.rels", documentRels);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/document.xml", documentXml);
  fs.writeFileSync(
    path.join(docxDir, filename),
    zip.generate({ type: "nodebuffer" }),
  );
}

// --- Test fixtures ---
writeDocx("sample-letter.docx", [
  p("Sample letter — Local {localNumber}", { style: "Heading1", bold: true }),
  p("Dear {memberName},"),
  p("{body}"),
  p("In solidarity,"),
  p("{stewardName}"),
  p("{#items}"),
  p("- {label}: {detail}"),
  p("{/items}"),
]);

const sampleWb = new ExcelJS.Workbook();
const sampleWs = sampleWb.addWorksheet("Roster");
sampleWs.getCell("A1").value = "Local";
sampleWs.getCell("B1").value = "";
sampleWs.getCell("A3").value = "Name";
sampleWs.getCell("B3").value = "Role";
sampleWs.getCell("C3").value = "Email";
for (const addr of ["A3", "B3", "C3"]) {
  sampleWs.getCell(addr).font = { bold: true };
}
sampleWs.getColumn(1).width = 24;
sampleWs.getColumn(2).width = 20;
sampleWs.getColumn(3).width = 32;
await sampleWb.xlsx.writeFile(path.join(xlsxDir, "sample-roster.xlsx"));

function docxForPreset(stem, fill, ink) {
  switch (stem) {
    case "letterhead":
      return [
        ...letterheadBlock(fill, ink),
        p("Letterhead / stationery", { style: "Title", bold: true, size: "32" }),
        emptyP(80),
        p("{body}", { after: 240 }),
        emptyP(400),
        p("— Local {localNumber}", { color: "666666", size: "18" }),
      ];
    case "simple-letter":
      return [
        ...letterheadBlock(fill, ink),
        p("{date}", { after: 200 }),
        p("Dear {memberName},", { after: 200 }),
        p("{body}", { after: 240 }),
        p("In solidarity,", { after: 80 }),
        p("{stewardName}", { bold: true }),
        p("Local {localNumber}", { color: "666666", size: "18" }),
      ];
    case "formal-grievance":
      return [
        ...letterheadBlock(fill, ink),
        p("Grievance correspondence", {
          style: "Heading1",
          bold: true,
          size: "28",
        }),
        p("Subject: {title}", { bold: true, after: 160 }),
        p("Member: {memberName}"),
        p("Date: {date}", { after: 200 }),
        p("{body}", { after: 240 }),
        p("Requested next step / contact: {contactName}", { after: 200 }),
        p("In solidarity,", { after: 80 }),
        p("{stewardName}", { bold: true }),
        p("Steward — Local {localNumber}", { color: "666666", size: "18" }),
      ];
    case "quick-event":
      return [
        ...letterheadBlock(fill, ink),
        p("{title}", { style: "Title", bold: true, size: "40", after: 80 }),
        p("{subtitle}", { size: "26", after: 200 }),
        p("When", {
          fill,
          color: ink,
          bold: true,
          size: "20",
          after: 40,
        }),
        p("{date}  ·  {time}", { bold: true, after: 120 }),
        p("Where", {
          fill,
          color: ink,
          bold: true,
          size: "20",
          after: 40,
        }),
        p("{location}", { bold: true, after: 200 }),
        p("{body}", { after: 240 }),
        p("Questions: {contactName}", { color: "666666" }),
        p("Local {localNumber}", { color: "666666", size: "18" }),
      ];
    case "poster-announcement":
      return [
        ...letterheadBlock(fill, ink),
        p("{headline}", {
          style: "Title",
          bold: true,
          size: "48",
          after: 120,
        }),
        p("{title}", { bold: true, size: "32", after: 200 }),
        p("{body}", { size: "24", after: 280 }),
        p("{cta}", {
          fill,
          color: ink,
          bold: true,
          size: "28",
          after: 160,
        }),
        p("— {contactName}  ·  Local {localNumber}", {
          color: "666666",
          size: "18",
        }),
      ];
    default:
      throw new Error(`Unknown stem ${stem}`);
  }
}

async function writeStepsXlsx(filename, fillHex) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Steps");
  ws.getCell("A1").value = "Local";
  ws.getCell("B1").value = "";
  ws.getCell("A2").value = "Title";
  ws.getCell("B2").value = "";
  ws.getCell("A3").value = "Member";
  ws.getCell("B3").value = "";
  for (const r of [1, 2, 3]) {
    ws.getCell(`A${r}`).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell(`A${r}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${fillHex}` },
    };
  }
  const headers = ["Date", "Step", "Action", "Owner", "Status"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(5, i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EEF4" },
    };
  });
  // Sample starter rows (export fills may overwrite A6..)
  ws.getCell("A6").value = "";
  ws.getCell("B6").value = "1";
  ws.getCell("C6").value = "";
  ws.getCell("D6").value = "";
  ws.getCell("E6").value = "Open";
  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 36;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;
  await wb.xlsx.writeFile(path.join(xlsxDir, filename));
}

async function writeRsvpXlsx(filename, fillHex) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("RSVP");
  ws.getCell("A1").value = "Event";
  ws.getCell("B1").value = "";
  ws.getCell("A2").value = "Local";
  ws.getCell("B2").value = "";
  ws.getCell("A3").value = "When";
  ws.getCell("B3").value = "";
  ws.getCell("A4").value = "Where";
  ws.getCell("B4").value = "";
  for (const r of [1, 2, 3, 4]) {
    ws.getCell(`A${r}`).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell(`A${r}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${fillHex}` },
    };
  }
  ["Name", "Email", "Phone", "Notes"].forEach((h, i) => {
    const cell = ws.getCell(6, i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EEF4" },
    };
  });
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 28;
  await wb.xlsx.writeFile(path.join(xlsxDir, filename));
}

const PRESETS = {
  letterhead: { xlsx: null },
  "simple-letter": { xlsx: null },
  "formal-grievance": { xlsx: "steps" },
  "quick-event": { xlsx: "rsvp" },
  "poster-announcement": { xlsx: null },
};

for (const [stem, meta] of Object.entries(PRESETS)) {
  for (const [colorKey, chrome] of Object.entries(COLORS)) {
    writeDocx(
      `${stem}_${colorKey}.docx`,
      docxForPreset(stem, chrome.fill, chrome.ink),
    );
    if (meta.xlsx === "steps") {
      await writeStepsXlsx(`${stem}_${colorKey}.xlsx`, chrome.fill);
    }
    if (meta.xlsx === "rsvp") {
      await writeRsvpXlsx(`${stem}_${colorKey}.xlsx`, chrome.fill);
    }
  }
}

console.log("Wrote pristine Office baselines (letterhead, letters, packs).");
