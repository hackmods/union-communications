import JSZip from "jszip";
export type OfficePackageKind = "docx" | "dotx" | "xlsx" | "pptx";
export class OfficePackageValidationError extends Error {
  constructor(readonly issues: string[]) { super(`Office package failed validation: ${issues.join("; ")}`); this.name = "OfficePackageValidationError"; }
}
function normalize(source: string, target: string): string {
  const out: string[] = [];
  for (const part of `${source}/${target}`.split("/")) { if (!part || part === ".") continue; if (part === "..") out.pop(); else out.push(part); }
  return out.join("/");
}
function xmlIssue(xml: string): string | null {
  const stack: string[] = [];
  const scrubbed = xml.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?[\s\S]*?\?>/g, "");
  for (const match of scrubbed.matchAll(/<\s*(\/)?\s*([A-Za-z_][\w:.-]*)([^>]*)>/g)) {
    const closing = Boolean(match[1]); const name = match[2]; const tail = match[3];
    if (closing) { if (stack.pop() !== name) return `mismatched closing tag ${name}`; }
    else if (!/\/\s*$/.test(tail)) stack.push(name);
  }
  return stack.length ? `unclosed tag ${stack.at(-1)}` : null;
}
/** Portable structural validation used before every Office download. */
export async function validateOfficePackage(blob: Blob, kind: OfficePackageKind): Promise<void> {
  const issues: string[] = [];
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true }); } catch { throw new OfficePackageValidationError(["invalid ZIP archive"]); }
  const required = { docx: "word/document.xml", dotx: "word/document.xml", xlsx: "xl/workbook.xml", pptx: "ppt/presentation.xml" }[kind];
  if (!zip.file(required)) issues.push(`missing ${required}`);
  const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
  if (!contentTypes?.includes("<Types")) issues.push("missing or malformed [Content_Types].xml");
  const covered = (path: string) => contentTypes?.includes(`PartName="/${path}"`) || new RegExp(`Extension="${path.split(".").pop() ?? ""}"`, "i").test(contentTypes ?? "");
  for (const path of Object.keys(zip.files).filter((p) => !zip.files[p].dir && !p.endsWith(".rels") && p !== "[Content_Types].xml")) if (!covered(path)) issues.push(`no content type for ${path}`);
  const relIds = new Set<string>();
  const fontRelationships = new Map<string, Set<string>>();
  for (const relPath of Object.keys(zip.files).filter((p) => p.endsWith(".rels"))) {
    const xml = await zip.file(relPath)!.async("string");
    if (!xml.includes("<Relationships")) issues.push(`malformed ${relPath}`);
    const malformed = xmlIssue(xml); if (malformed) issues.push(`${relPath}: ${malformed}`);
    const sourceDir = relPath === "_rels/.rels" ? "" : relPath.replace(/\/_rels\/[^/]+\.rels$/, "");
    for (const match of xml.matchAll(/<Relationship\b([^>]+)\/?\s*>/g)) {
      const attrs = match[1]; const id = /\bId="([^"]+)"/.exec(attrs)?.[1]; const target = /\bTarget="([^"]+)"/.exec(attrs)?.[1];
      const key = `${relPath}:${id}`;
      if (!id || relIds.has(key)) issues.push(`duplicate or missing relationship id in ${relPath}`); else relIds.add(key);
      if (target && !/TargetMode="External"/.test(attrs) && !zip.file(normalize(sourceDir, target))) issues.push(`unresolved relationship ${relPath} -> ${target}`);
      if (/relationships\/font"/.test(attrs) && id) {
        const ids = fontRelationships.get(relPath) ?? new Set<string>(); ids.add(id); fontRelationships.set(relPath, ids);
      }
    }
  }
  for (const path of Object.keys(zip.files).filter((p) => /\.xml$/.test(p))) {
    const malformed = xmlIssue(await zip.file(path)!.async("string")); if (malformed) issues.push(`${path}: ${malformed}`);
  }
  const fontReferenceContract = async (xmlPath: string, relPath: string) => {
    const xml = await zip.file(xmlPath)?.async("string"); if (!xml) return;
    const referenced = new Set([...xml.matchAll(/<(?:w:embedRegular|w:embedBold|p:regular|p:bold)\b[^>]*\br:id="([^"]+)"/g)].map((m) => m[1]));
    const related = fontRelationships.get(relPath) ?? new Set<string>();
    for (const id of referenced) if (!related.has(id)) issues.push(`unresolved font reference ${xmlPath} -> ${id}`);
    for (const id of related) if (!referenced.has(id)) issues.push(`orphan font relationship ${relPath} -> ${id}`);
  };
  await fontReferenceContract("word/fontTable.xml", "word/_rels/fontTable.xml.rels");
  await fontReferenceContract("ppt/presentation.xml", "ppt/_rels/presentation.xml.rels");
  for (const font of Object.keys(zip.files).filter((p) => /\.(odttf|fntdata)$/.test(p))) {
    const bytes = await zip.file(font)!.async("uint8array");
    if (bytes.length < 4) issues.push(`empty font part ${font}`);
    if (font.endsWith(".fntdata") && !(String.fromCharCode(...bytes.slice(0, 4)) === "OTTO" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0))) issues.push(`invalid raw font signature ${font}`);
  }
  if (issues.length) throw new OfficePackageValidationError([...new Set(issues)]);
}
