/**
 * Package Brand Kit OFL TTF faces into DOCX/PPTX (obfuscated OOXML parts + NOTICE).
 * Mirrors Website ZIP font subset; keeps exports readable offline without installed catalog fonts.
 */

import JSZip from "jszip";
import {
  collectOfficeEmbedTtfFiles,
  loadCanvasFontBinary,
  OFFICE_FONT_NOTICE,
  type CanvasFontId,
  type OfficeEmbedTtfFile,
} from "@/lib/comms/canvas-fonts";

const DOCX_FONT_TABLE_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";
const OOXML_FONT_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
const DOCX_FONT_TABLE_CT =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml";
const OBFUSCATED_FONT_CT =
  "application/vnd.openxmlformats-officedocument.obfuscatedFont";

type PreparedFont = {
  family: string;
  weight: number;
  zipPath: string;
  relId: string;
  fontKey: string;
  bytes: Uint8Array;
};

function newFontKey(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().toUpperCase()
      : "00000000-0000-0000-0000-000000000001";
  return `{${id}}`;
}

/** Microsoft GUID byte order for OOXML font obfuscation. */
function fontKeyGuidBytes(guidStr: string): Uint8Array {
  const hex = guidStr.replace(/[{}-]/g, "");
  const bytes = new Uint8Array(16);
  bytes[0] = parseInt(hex.slice(6, 8), 16);
  bytes[1] = parseInt(hex.slice(4, 6), 16);
  bytes[2] = parseInt(hex.slice(2, 4), 16);
  bytes[3] = parseInt(hex.slice(0, 2), 16);
  bytes[4] = parseInt(hex.slice(10, 12), 16);
  bytes[5] = parseInt(hex.slice(8, 10), 16);
  bytes[6] = parseInt(hex.slice(14, 16), 16);
  bytes[7] = parseInt(hex.slice(12, 14), 16);
  for (let i = 0; i < 8; i++) {
    bytes[8 + i] = parseInt(hex.slice(16 + i * 2, 18 + i * 2), 16);
  }
  return bytes;
}

export function obfuscateOoxmlFont(
  fontData: Uint8Array,
  fontKey: string,
): Uint8Array {
  const out = new Uint8Array(fontData);
  const guid = fontKeyGuidBytes(fontKey);
  const limit = Math.min(32, out.length);
  for (let i = 0; i < limit; i++) {
    out[i] ^= guid[i % 16];
    out[i] ^= guid[15 - (i % 16)];
  }
  return out;
}

function nextRelId(existing: string): string {
  const nums = [...existing.matchAll(/Id="rId(\d+)"/g)].map((m) =>
    Number(m[1]),
  );
  const max = nums.length ? Math.max(...nums) : 0;
  return `rId${max + 1}`;
}

function appendOverride(
  contentTypes: string,
  partName: string,
  contentType: string,
): string {
  if (contentTypes.includes(`PartName="${partName}"`)) return contentTypes;
  const insert = `<Override PartName="${partName}" ContentType="${contentType}"/>`;
  return contentTypes.replace("</Types>", `${insert}</Types>`);
}

function appendRelationship(
  relsXml: string,
  id: string,
  type: string,
  target: string,
): string {
  if (relsXml.includes(`Id="${id}"`)) return relsXml;
  const insert = `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`;
  return relsXml.replace("</Relationships>", `${insert}</Relationships>`);
}

async function prepareFonts(
  files: OfficeEmbedTtfFile[],
  zipPrefix: "word" | "ppt",
  ext: "odttf" | "fntdata",
): Promise<PreparedFont[]> {
  const prepared: PreparedFont[] = [];
  let index = 0;
  for (const spec of files) {
    const raw = await loadCanvasFontBinary(
      spec.fontId,
      spec.weight,
      "ttf",
    );
    if (!raw) continue;
    index += 1;
    const fontKey = newFontKey();
    prepared.push({
      family: spec.family,
      weight: spec.weight,
      zipPath: `${zipPrefix}/fonts/font${index}.${ext}`,
      relId: `rIdFont${index}`,
      fontKey,
      bytes: obfuscateOoxmlFont(raw, fontKey),
    });
  }
  return prepared;
}

function fontFamilyPitch(family: string): "roman" | "swiss" {
  const lower = family.toLowerCase();
  if (lower.includes("serif") || lower.includes("slab")) return "roman";
  return "swiss";
}

function buildDocxFontTableXml(
  byFamily: Map<string, PreparedFont[]>,
): string {
  const entries: string[] = [];
  for (const [family, fonts] of byFamily) {
    const regular = fonts.find((f) => f.weight < 600) ?? fonts[0];
    const bold = fonts.find((f) => f.weight >= 600 && f !== regular);
    const pitch = fontFamilyPitch(family);
    let embed = "";
    if (regular) {
      embed += `<w:embedRegular r:id="${regular.relId}" w:fontKey="${regular.fontKey}"/>`;
    }
    if (bold) {
      embed += `<w:embedBold r:id="${bold.relId}" w:fontKey="${bold.fontKey}"/>`;
    }
    entries.push(`<w:font w:name="${family}">
  <w:altName w:val="${family}"/>
  <w:charset w:val="00"/>
  <w:family w:val="${pitch}"/>
  <w:pitch w:val="variable"/>
  <w:sig w:usb0="E0002AFF" w:usb1="00000000" w:usb2="00000001" w:usb3="00000000" w:csb0="0000009F" w:csb1="00000000"/>
  ${embed}
</w:font>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
${entries.join("\n")}
</w:fonts>`;
}

function buildFontTableRels(fonts: PreparedFont[]): string {
  const rels = fonts.map(
    (f) =>
      `<Relationship Id="${f.relId}" Type="${OOXML_FONT_REL}" Target="../fonts/${f.zipPath.split("/").pop()}"/>`,
  );
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels.join("\n")}
</Relationships>`;
}

function groupByFamily(fonts: PreparedFont[]): Map<string, PreparedFont[]> {
  const map = new Map<string, PreparedFont[]>();
  for (const f of fonts) {
    const list = map.get(f.family) ?? [];
    list.push(f);
    map.set(f.family, list);
  }
  return map;
}

async function embedOoxmlFonts(
  blob: Blob,
  headlineId: CanvasFontId,
  bodyId: CanvasFontId,
  kind: "docx" | "pptx",
): Promise<Blob> {
  const specs = collectOfficeEmbedTtfFiles(headlineId, bodyId);
  if (specs.length === 0) return blob;

  const zipPrefix = kind === "docx" ? "word" : "ppt";
  const ext = kind === "docx" ? "odttf" : "fntdata";
  const prepared = await prepareFonts(specs, zipPrefix, ext);
  if (prepared.length === 0) return blob;

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  for (const font of prepared) {
    zip.file(font.zipPath, font.bytes);
  }
  zip.file(`${zipPrefix}/fonts/NOTICE.txt`, OFFICE_FONT_NOTICE);

  let ct = await zip.file("[Content_Types].xml")?.async("string");
  if (ct) {
    for (const part of prepared) {
      ct = appendOverride(ct, `/${part.zipPath}`, OBFUSCATED_FONT_CT);
    }
    if (kind === "docx") {
      ct = appendOverride(ct, "/word/fontTable.xml", DOCX_FONT_TABLE_CT);
    }
    zip.file("[Content_Types].xml", ct);
  }

  if (kind === "docx") {
    const byFamily = groupByFamily(prepared);
    zip.file("word/fontTable.xml", buildDocxFontTableXml(byFamily));
    zip.file(
      "word/_rels/fontTable.xml.rels",
      buildFontTableRels(prepared),
    );

    let docRels =
      (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";
    if (docRels && !docRels.includes(DOCX_FONT_TABLE_REL)) {
      const relId = nextRelId(docRels);
      docRels = appendRelationship(
        docRels,
        relId,
        DOCX_FONT_TABLE_REL,
        "fontTable.xml",
      );
      zip.file("word/_rels/document.xml.rels", docRels);
    }
  } else {
    let presRels =
      (await zip.file("ppt/_rels/presentation.xml.rels")?.async("string")) ??
      "";
    for (const font of prepared) {
      if (!presRels.includes(`Id="${font.relId}"`)) {
        presRels = appendRelationship(
          presRels,
          font.relId,
          OOXML_FONT_REL,
          `fonts/${font.zipPath.split("/").pop()}`,
        );
      }
    }
    if (presRels) {
      zip.file("ppt/_rels/presentation.xml.rels", presRels);
    }

    let presentation =
      (await zip.file("ppt/presentation.xml")?.async("string")) ?? "";
    if (presentation && !presentation.includes("embeddedFontLst")) {
      const entries = [...groupByFamily(prepared).keys()]
        .map(
          (family) =>
            `<p:embeddedFont type="Regular" style="${family}"><p:font typeface="${family}"/></p:embeddedFont>`,
        )
        .join("");
      const block = `<p:embeddedFontLst>${entries}</p:embeddedFontLst>`;
      presentation = presentation.replace(
        "</p:presentation>",
        `${block}</p:presentation>`,
      );
      zip.file("ppt/presentation.xml", presentation);
    }
  }

  const out = await zip.generateAsync({ type: "uint8array" });
  const mime =
    kind === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return new Blob([out], { type: mime });
}

export async function embedDocxBrandFonts(
  blob: Blob,
  headlineId: CanvasFontId,
  bodyId: CanvasFontId,
): Promise<Blob> {
  return embedOoxmlFonts(blob, headlineId, bodyId, "docx");
}

export async function embedPptxBrandFonts(
  blob: Blob,
  headlineId: CanvasFontId,
  bodyId: CanvasFontId,
): Promise<Blob> {
  return embedOoxmlFonts(blob, headlineId, bodyId, "pptx");
}

/** List obfuscated font parts inside an OOXML blob (tests). */
export async function listEmbeddedOoxmlFonts(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return Object.keys(zip.files).filter(
    (p) =>
      (p.startsWith("word/fonts/") || p.startsWith("ppt/fonts/")) &&
      (p.endsWith(".odttf") || p.endsWith(".fntdata")),
  );
}
