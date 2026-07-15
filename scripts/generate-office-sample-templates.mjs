/**
 * One-shot helper to write demo Office templates under public/templates/office/.
 * Run: node scripts/generate-office-sample-templates.mjs
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

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${p("Sample letter — Local {localNumber}")}
    ${p("Dear {memberName},")}
    ${p("{body}")}
    ${p("In solidarity,")}
    ${p("{stewardName}")}
    ${p("{#items}")}
    ${p("- {label}: {detail}")}
    ${p("{/items}")}
    <w:sectPr/>
  </w:body>
</w:document>`;

const zip = new PizZip();
zip.file("[Content_Types].xml", contentTypes);
zip.file("_rels/.rels", rels);
zip.file("word/document.xml", documentXml);
fs.writeFileSync(
  path.join(docxDir, "sample-letter.docx"),
  zip.generate({ type: "nodebuffer" }),
);

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Roster");
ws.getCell("A1").value = "Local";
ws.getCell("B1").value = ""; // fill() sets local number
ws.getCell("A3").value = "Name";
ws.getCell("B3").value = "Role";
ws.getCell("C3").value = "Email";
for (const addr of ["A3", "B3", "C3"]) {
  ws.getCell(addr).font = { bold: true };
}
ws.getColumn(1).width = 24;
ws.getColumn(2).width = 20;
ws.getColumn(3).width = 32;
await wb.xlsx.writeFile(path.join(xlsxDir, "sample-roster.xlsx"));

console.log("Wrote sample-letter.docx and sample-roster.xlsx");
