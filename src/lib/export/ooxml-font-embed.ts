/** Format-aware OOXML font finalizers. */
import JSZip from "jszip";
import { collectOfficeEmbedTtfFiles, loadCanvasFontBinary, OFFICE_FONT_NOTICE, type CanvasFontId, type OfficeEmbedTtfFile } from "@/lib/comms/canvas-fonts";
import { validateOfficePackage } from "@/lib/export/office-package-validator";

const FONT_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
const FONT_TABLE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";
const FONT_TABLE_CT = "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml";
const XMLNS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
type PreparedFont = { family: string; weight: number; path: string; relId: string; key: string; bytes: Uint8Array };

function xmlEscape(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
function newFontKey(): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().toUpperCase() : "00000000-0000-0000-0000-000000000001";
  return `{${id}}`;
}

/** ECMA-376: XOR the first 32 bytes with the GUID bytes in reverse order. */
export function obfuscateOoxmlFont(fontData: Uint8Array, fontKey: string): Uint8Array {
  const hex = fontKey.replace(/[{}-]/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error("Invalid OOXML font key");
  const reversed = Uint8Array.from(hex.match(/../g)!.map((v) => parseInt(v, 16)).reverse());
  const out = new Uint8Array(fontData);
  for (let i = 0; i < Math.min(32, out.length); i += 1) out[i] ^= reversed[i % 16];
  return out;
}

function appendOverride(xml: string, name: string, type: string): string {
  return xml.includes(`PartName="${name}"`) ? xml : xml.replace("</Types>", `<Override PartName="${name}" ContentType="${type}"/></Types>`);
}
function ensureTxtContentType(xml: string): string {
  return /Extension="txt"/i.test(xml) ? xml : xml.replace("</Types>", '<Default Extension="txt" ContentType="text/plain"/></Types>');
}
function appendRelationship(xml: string, id: string, type: string, target: string): string {
  return xml.replace("</Relationships>", `<Relationship Id="${id}" Type="${type}" Target="${target}"/></Relationships>`);
}
function group(fonts: PreparedFont[]): Map<string, PreparedFont[]> {
  const result = new Map<string, PreparedFont[]>();
  for (const font of fonts) result.set(font.family, [...(result.get(font.family) ?? []), font]);
  return result;
}
function referencedFaces(specs: OfficeEmbedTtfFile[]): OfficeEmbedTtfFile[] {
  const families = new Map<string, OfficeEmbedTtfFile[]>();
  for (const spec of specs) families.set(spec.family, [...(families.get(spec.family) ?? []), spec]);
  return [...families.values()].flatMap((family) => {
    const regular = [...family].filter((font) => font.weight < 600).sort((a, b) => Math.abs(a.weight - 400) - Math.abs(b.weight - 400))[0] ?? family[0];
    const bold = [...family].filter((font) => font.weight >= 600).sort((a, b) => Math.abs(a.weight - 700) - Math.abs(b.weight - 700))[0];
    return bold && bold !== regular ? [regular, bold] : [regular];
  });
}
async function loadFonts(specs: OfficeEmbedTtfFile[], kind: "docx" | "pptx"): Promise<PreparedFont[]> {
  const result: PreparedFont[] = [];
  for (const spec of specs) {
    const raw = await loadCanvasFontBinary(spec.fontId, spec.weight, "ttf");
    if (!raw) continue;
    const index = result.length + 1;
    const key = newFontKey();
    result.push({ family: spec.family, weight: spec.weight, path: kind === "docx" ? `word/fonts/font${index}.odttf` : `ppt/fonts/font${index}.fntdata`, relId: `rIdEmbeddedFont${index}`, key, bytes: kind === "docx" ? obfuscateOoxmlFont(raw, key) : new Uint8Array(raw) });
  }
  return result;
}
function wordFontEntry(family: string, fonts: PreparedFont[]): string {
  const regular = fonts.find((font) => font.weight < 600) ?? fonts[0];
  const bold = fonts.find((font) => font.weight >= 600);
  const refs = [`<w:embedRegular r:id="${regular.relId}" w:fontKey="${regular.key}"/>`, bold && bold !== regular ? `<w:embedBold r:id="${bold.relId}" w:fontKey="${bold.key}"/>` : ""].join("");
  return `<w:font w:name="${xmlEscape(family)}"><w:altName w:val="${xmlEscape(family)}"/><w:charset w:val="00"/><w:family w:val="auto"/><w:pitch w:val="variable"/>${refs}</w:font>`;
}
function mergeWordFontTable(existing: string, fonts: PreparedFont[]): string {
  let xml = existing || `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${XMLNS_R}"></w:fonts>`;
  if (!xml.includes("xmlns:r=")) xml = xml.replace("<w:fonts", `<w:fonts xmlns:r="${XMLNS_R}"`);
  if (/<w:fonts\b[^>]*\/>/.test(xml)) xml = xml.replace(/<w:fonts\b([^>]*)\/>/, "<w:fonts$1></w:fonts>");
  for (const [family, familyFonts] of group(fonts)) {
    const safe = xmlEscape(family).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<w:font\\s+w:name="${safe}"[\\s\\S]*?</w:font>`);
    const entry = wordFontEntry(family, familyFonts);
    xml = pattern.test(xml) ? xml.replace(pattern, entry) : xml.replace("</w:fonts>", `${entry}</w:fonts>`);
  }
  return xml;
}
function ensureWordSettings(xml: string): string {
  let out = xml;
  if (!out.includes("<w:embedTrueTypeFonts")) out = out.replace("</w:settings>", "<w:embedTrueTypeFonts/></w:settings>");
  if (!out.includes("<w:saveSubsetFonts")) out = out.replace("</w:settings>", "<w:saveSubsetFonts/></w:settings>");
  return out;
}
async function finalizeDocx(blob: Blob, headlineId: CanvasFontId, bodyId: CanvasFontId): Promise<Blob> {
  const specs = collectOfficeEmbedTtfFiles(headlineId, bodyId);
  if (!specs.length) { await validateOfficePackage(blob, "docx"); return blob; }
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const fonts = await loadFonts(referencedFaces(specs), "docx");
  for (const font of fonts) zip.file(font.path, font.bytes);
  zip.file("word/fonts/NOTICE.txt", OFFICE_FONT_NOTICE);
  zip.file("word/fontTable.xml", mergeWordFontTable(await zip.file("word/fontTable.xml")?.async("string") ?? "", fonts));
  zip.file("word/_rels/fontTable.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fonts.map((f) => `<Relationship Id="${f.relId}" Type="${FONT_REL}" Target="fonts/${f.path.split("/").pop()}"/>`).join("")}</Relationships>`);
  const settings = await zip.file("word/settings.xml")?.async("string");
  if (settings) zip.file("word/settings.xml", ensureWordSettings(settings));
  let rels = await zip.file("word/_rels/document.xml.rels")?.async("string") ?? "";
  if (rels && !rels.includes(FONT_TABLE_REL)) rels = appendRelationship(rels, "rIdUnionOpsFontTable", FONT_TABLE_REL, "fontTable.xml");
  if (rels) zip.file("word/_rels/document.xml.rels", rels);
  let ct = ensureTxtContentType(appendOverride(await zip.file("[Content_Types].xml")!.async("string"), "/word/fontTable.xml", FONT_TABLE_CT));
  for (const font of fonts) ct = appendOverride(ct, `/${font.path}`, "application/vnd.openxmlformats-officedocument.obfuscatedFont");
  zip.file("[Content_Types].xml", ct);
  const out = new Blob([Buffer.from(await zip.generateAsync({ type: "uint8array" }))], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  await validateOfficePackage(out, "docx");
  return out;
}
async function finalizePptx(blob: Blob, headlineId: CanvasFontId, bodyId: CanvasFontId): Promise<Blob> {
  const specs = collectOfficeEmbedTtfFiles(headlineId, bodyId);
  if (!specs.length) { await validateOfficePackage(blob, "pptx"); return blob; }
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const fonts = await loadFonts(referencedFaces(specs), "pptx");
  for (const font of fonts) zip.file(font.path, font.bytes);
  zip.file("ppt/fonts/NOTICE.txt", OFFICE_FONT_NOTICE);
  let rels = await zip.file("ppt/_rels/presentation.xml.rels")!.async("string");
  for (const font of fonts) rels = appendRelationship(rels, font.relId, FONT_REL, `fonts/${font.path.split("/").pop()}`);
  zip.file("ppt/_rels/presentation.xml.rels", rels);
  const entries = [...group(fonts)].map(([family, familyFonts]) => {
    const regular = familyFonts.find((font) => font.weight < 600) ?? familyFonts[0];
    const bold = familyFonts.find((font) => font.weight >= 600);
    return `<p:embeddedFont><p:font typeface="${xmlEscape(family)}"/><p:regular r:id="${regular.relId}"/>${bold && bold !== regular ? `<p:bold r:id="${bold.relId}"/>` : ""}</p:embeddedFont>`;
  }).join("");
  let presentation = await zip.file("ppt/presentation.xml")!.async("string");
  presentation = presentation.replace(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/, "").replace("</p:presentation>", `<p:embeddedFontLst>${entries}</p:embeddedFontLst></p:presentation>`);
  zip.file("ppt/presentation.xml", presentation);
  let ct = ensureTxtContentType(await zip.file("[Content_Types].xml")!.async("string"));
  for (const font of fonts) ct = appendOverride(ct, `/${font.path}`, "application/x-fontdata");
  zip.file("[Content_Types].xml", ct);
  const out = new Blob([Buffer.from(await zip.generateAsync({ type: "uint8array" }))], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  await validateOfficePackage(out, "pptx");
  return out;
}
export const embedDocxBrandFonts = finalizeDocx;
export const embedPptxBrandFonts = finalizePptx;
export async function listEmbeddedOoxmlFonts(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return Object.keys(zip.files).filter((p) => /^(word|ppt)\/fonts\/.*\.(odttf|fntdata)$/.test(p));
}
