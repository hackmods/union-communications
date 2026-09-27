import { DOMImplementation, DOMParser, XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_SVG_BYTES = 1024 * 1024;
const SVG_ELEMENTS = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "title", "desc"]);
const SVG_ATTRIBUTES = new Set(["xmlns", "viewBox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "opacity", "transform", "id", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "clipPathUnits", "maskUnits"]);

function safeSvgAttribute(name: string, value: string): boolean {
  if (name === "xmlns") return value === SVG_NS;
  if (name === "id") return /^[A-Za-z_][\w:.-]{0,100}$/.test(value);
  if (["fill", "stroke", "stop-color"].includes(name)) {
    return /^(?:none|currentColor|#[0-9a-fA-F]{3,8}|[A-Za-z]{1,30}|url\(#[A-Za-z_][\w:.-]{0,100}\))$/.test(value);
  }
  if (name === "d") return /^[MmZzLlHhVvCcSsQqTtAa0-9eE+.,\-\s]*$/.test(value);
  if (name === "points" || name === "viewBox") return /^[0-9eE+.,\-\s]+$/.test(value);
  if (name === "transform" || name === "gradientTransform") return /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([0-9eE+.,\-\s]+\)\s*)+$/.test(value);
  return /^[0-9eE+.,%\-\s]+$/.test(value);
}

/**
 * Strip all active/external SVG features and rebuild from a small static vector
 * allowlist. Sanitized SVGs are always delivered as downloads with CSP/nosniff.
 */
export function sanitizeSvgBytes(input: Buffer): Buffer {
  if (input.length < 1 || input.length > MAX_SVG_BYTES) throw new Error("SVG must be between 1 byte and 1 MB");
  const source = new TextDecoder("utf-8", { fatal: true }).decode(input);
  if (/<!\s*(?:DOCTYPE|ENTITY)/i.test(source)) throw new Error("SVG document types and entities are not allowed");
  let parserError = false;
  const parsed = new DOMParser({ onError: (level) => { if (level === "error" || level === "fatalError") parserError = true; } }).parseFromString(source, "image/svg+xml");
  const root = parsed.documentElement;
  if (parserError || !root || root.localName !== "svg" || (root.namespaceURI && root.namespaceURI !== SVG_NS)) throw new Error("Malformed SVG document");
  const safeDocument = new DOMImplementation().createDocument(SVG_NS, "svg", null);
  let nodes = 0;
  const copyChildren = (sourceNode: XmlElement, targetNode: XmlElement, depth: number) => {
    if (depth > 32 || ++nodes > 10000) throw new Error("SVG document is too complex");
    for (let index = 0; index < sourceNode.attributes.length; index += 1) {
      const attr = sourceNode.attributes.item(index);
      if (!attr?.name || !SVG_ATTRIBUTES.has(attr.name) || /(?:^on|style|href|src)/i.test(attr.name)) continue;
      if (safeSvgAttribute(attr.name, attr.value)) targetNode.setAttribute(attr.name, attr.value);
    }
    for (let index = 0; index < sourceNode.childNodes.length; index += 1) {
      const child = sourceNode.childNodes.item(index);
      if (!child) continue;
      if (child.nodeType === 3) {
        if (sourceNode.localName && ["title", "desc"].includes(sourceNode.localName)) targetNode.appendChild(safeDocument.createTextNode(child.nodeValue ?? ""));
        continue;
      }
      if (child.nodeType !== 1) continue;
      const element = child as XmlElement;
      if (!element.localName || !SVG_ELEMENTS.has(element.localName) || (element.namespaceURI && element.namespaceURI !== SVG_NS)) continue;
      const safeChild = safeDocument.createElementNS(SVG_NS, element.localName);
      targetNode.appendChild(safeChild);
      copyChildren(element, safeChild, depth + 1);
    }
  };
  const safeRoot = safeDocument.documentElement;
  if (!safeRoot) throw new Error("Could not create a safe SVG document");
  copyChildren(root, safeRoot, 0);
  const output = new XMLSerializer().serializeToString(safeDocument);
  return Buffer.from(output, "utf8");
}

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  "text/csv": (b) => {
    if (b.length === 0 || b.includes(0)) return false;
    try { new TextDecoder("utf-8", { fatal: true }).decode(b); return true; } catch { return false; }
  },
  "application/pdf": (b) => b.subarray(0, 5).toString("ascii") === "%PDF-",
  "image/png": (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  "image/svg+xml": (b) => b.toString("utf8").startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\"") && !/<(?:script|foreignObject|style|image|use)\b/i.test(b.toString("utf8")),
  "application/msword": (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && [0x03, 0x05, 0x07].includes(b[2]) && [0x04, 0x06, 0x08].includes(b[3]),
};

/** MIME labels are untrusted; accepted formats must also match their byte signature. */
export function validateAttachmentBytes(mimeType: string, bytes: Buffer): string | null {
  const check = SIGNATURES[mimeType];
  if (!check) return "Unsupported file type";
  return check(bytes) ? null : "File contents do not match the declared file type";
}
