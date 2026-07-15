/**
 * Generate sample + color-variant Office baselines under public/templates/office/.
 * Run: node scripts/generate-office-sample-templates.mjs
 *
 * Color toggles in the Document Generator fetch these discrete files
 * (e.g. quick-event_red.docx vs quick-event_blue.docx). Theme chrome is
 * baked in via paragraph shading / header fills — not mutated at export time.
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
  brand: { fill: "003366", label: "Brand" },
  red: { fill: "9E1B32", label: "Red" },
  blue: { fill: "1B4F72", label: "Blue" },
};

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function p(text) {
  return `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function banner(fill, label) {
  return `<w:p>
  <w:pPr>
    <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
    <w:spacing w:before="120" w:after="120"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="28"/></w:rPr>
    <w:t xml:space="preserve">${label}</w:t>
  </w:r>
</w:p>`;
}

function writeDocx(filename, paragraphs) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n")}
    <w:sectPr/>
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rels);
  zip.file("word/document.xml", documentXml);
  fs.writeFileSync(
    path.join(docxDir, filename),
    zip.generate({ type: "nodebuffer" }),
  );
}

// --- Original samples (tests) ---
writeDocx("sample-letter.docx", [
  p("Sample letter — Local {localNumber}"),
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

const PRESETS = {
  "formal-grievance": {
    docx: (fill, label) => [
      banner(fill, `Formal grievance — ${label}`),
      p("Local {localNumber}"),
      p("{title}"),
      p("Date: {date}"),
      p("Member: {memberName}"),
      p("{body}"),
      p("Steward: {stewardName}"),
      p("Contact: {contactName}"),
      p("In solidarity."),
    ],
    xlsx: true,
  },
  "quick-event": {
    docx: (fill, label) => [
      banner(fill, `Quick event — ${label}`),
      p("Local {localNumber}"),
      p("{title}"),
      p("{subtitle}"),
      p("Date: {date}"),
      p("Time: {time}"),
      p("Location: {location}"),
      p("{body}"),
      p("Contact: {contactName}"),
    ],
    xlsx: true,
  },
  "poster-announcement": {
    docx: (fill, label) => [
      banner(fill, `Poster announcement — ${label}`),
      p("Local {localNumber}"),
      p("{title}"),
      p("{headline}"),
      p("{body}"),
      p("{cta}"),
      p("— {contactName}"),
    ],
    xlsx: false,
  },
};

async function writeDetailsXlsx(filename, fillHex) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Details");
  ws.getCell("A1").value = "Local";
  ws.getCell("A2").value = "Title";
  ws.getCell("A3").value = "Date";
  ws.getCell("A4").value = "Time";
  ws.getCell("A5").value = "Location";
  ws.getCell("A6").value = "Member";
  ws.getCell("A7").value = "Steward / Contact";
  ws.getCell("A8").value = "Body";
  ws.getCell("A9").value = "CTA / Headline";
  for (let r = 1; r <= 9; r++) {
    ws.getCell(`A${r}`).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell(`A${r}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${fillHex}` },
    };
  }
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 48;
  ws.getColumn(3).width = 28;
  await wb.xlsx.writeFile(path.join(xlsxDir, filename));
}

for (const [stem, preset] of Object.entries(PRESETS)) {
  for (const [colorKey, chrome] of Object.entries(COLORS)) {
    writeDocx(
      `${stem}_${colorKey}.docx`,
      preset.docx(chrome.fill, chrome.label),
    );
    if (preset.xlsx) {
      await writeDetailsXlsx(`${stem}_${colorKey}.xlsx`, chrome.fill);
    }
  }
}

console.log(
  "Wrote sample-letter.docx, sample-roster.xlsx, and color-variant presets.",
);
