/**
 * Generate favicon / PWA / Apple icon suite from host brand colours.
 *
 * Plate = config/host-brand.json primary (or PLATFORM orange).
 * Glyph = black or white via the same contrast rule as pickContrastingInk.
 * favicon.svg also adapts with prefers-color-scheme for dark browser chrome.
 *
 * Usage: node scripts/generate-favicons.mjs
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const INK_WHITE = "#FFFFFF";
const INK_BLACK = "#1A1A1A";
const PLATFORM_PRIMARY = "#C2410C";

const HEX = /^#[0-9A-Fa-f]{6}$/;

function hexToRgb(hex) {
  const n = hex.replace("#", "");
  if (n.length !== 6) return null;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(a, b) {
  const rgb1 = hexToRgb(a);
  const rgb2 = hexToRgb(b);
  if (!rgb1 || !rgb2) return 0;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Same rule as src/lib/utils/ink.ts pickContrastingInk */
function pickContrastingInk(background) {
  const whiteRatio = contrastRatio(INK_WHITE, background);
  const blackRatio = contrastRatio(INK_BLACK, background);
  return whiteRatio >= blackRatio ? INK_WHITE : INK_BLACK;
}

function resolvePaint(primary, ink = null) {
  if (ink === INK_WHITE) return { plate: INK_WHITE, glyph: primary };
  if (ink === INK_BLACK) return { plate: INK_BLACK, glyph: INK_WHITE };
  return { plate: primary, glyph: pickContrastingInk(primary) };
}

function buildStaticMarkSvg(primary) {
  const { plate, glyph } = resolvePaint(primary);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="UnionOps">
  <title>UnionOps</title>
  <desc>Interlocking u and o mark for UnionOps (brand plate, contrast-safe glyphs).</desc>
  <rect width="64" height="64" rx="14" fill="${plate}"/>
  <circle cx="44" cy="34" r="14" fill="none" stroke="${glyph}" stroke-width="10"/>
  <path d="M12 14v20a14 14 0 0 0 28 0V14" fill="none" stroke="${glyph}" stroke-width="10" stroke-linecap="butt" stroke-linejoin="round" opacity="0.88"/>
</svg>
`;
}

function buildAdaptiveFaviconSvg(primary) {
  const ink = pickContrastingInk(primary);
  const light = resolvePaint(primary);
  const dark = resolvePaint(primary, ink);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="UnionOps">
  <title>UnionOps</title>
  <desc>Interlocking u and o mark — brand layout colours with automatic black/white contrast.</desc>
  <style>
    .plate { fill: ${light.plate}; }
    .glyph { stroke: ${light.glyph}; }
    @media (prefers-color-scheme: dark) {
      .plate { fill: ${dark.plate}; }
      .glyph { stroke: ${dark.glyph}; }
    }
  </style>
  <rect class="plate" width="64" height="64" rx="14"/>
  <circle class="glyph" cx="44" cy="34" r="14" fill="none" stroke-width="10"/>
  <path class="glyph" d="M12 14v20a14 14 0 0 0 28 0V14" fill="none" stroke-width="10" stroke-linecap="butt" stroke-linejoin="round" opacity="0.88"/>
</svg>
`;
}

function readHostPrimary() {
  const brandPath = path.join(root, "config", "host-brand.json");
  try {
    const raw = JSON.parse(fs.readFileSync(brandPath, "utf8"));
    const primary = String(raw.primaryColor || "").toUpperCase();
    if (HEX.test(primary)) return primary;
  } catch {
    // fall through
  }
  return PLATFORM_PRIMARY;
}

async function main() {
  const primary = readHostPrimary();
  const publicDir = path.join(root, "public");
  const iconsDir = path.join(publicDir, "icons");
  fs.mkdirSync(iconsDir, { recursive: true });

  const adaptiveSvg = buildAdaptiveFaviconSvg(primary);
  const staticSvg = buildStaticMarkSvg(primary);
  const staticBuf = Buffer.from(staticSvg);

  fs.writeFileSync(path.join(publicDir, "favicon.svg"), adaptiveSvg);

  // Keep platform logo-mark.svg in sync with contrast-safe static mark
  fs.writeFileSync(
    path.join(publicDir, "assets", "unionops", "logo-mark.svg"),
    staticSvg,
  );

  const pinned = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="44" cy="34" r="14" fill="none" stroke="#000" stroke-width="10"/>
  <path d="M12 14v20a14 14 0 0 0 28 0V14" fill="none" stroke="#000" stroke-width="10" stroke-linecap="butt" stroke-linejoin="round"/>
</svg>
`;
  fs.writeFileSync(path.join(publicDir, "safari-pinned-tab.svg"), pinned);

  const sizes = [
    { file: path.join(publicDir, "apple-touch-icon.png"), size: 180 },
    { file: path.join(iconsDir, "icon-192.png"), size: 192 },
    { file: path.join(iconsDir, "icon-512.png"), size: 512 },
    { file: path.join(root, "src", "app", "icon.png"), size: 32 },
  ];

  for (const { file, size } of sizes) {
    await sharp(staticBuf).resize(size, size).png().toFile(file);
  }

  const png32 = await sharp(staticBuf).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);
  entry.writeUInt8(32, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(22, 12);
  fs.writeFileSync(
    path.join(publicDir, "favicon.ico"),
    Buffer.concat([header, entry, png32]),
  );

  console.log(`Favicon suite generated (primary ${primary}, glyph ${pickContrastingInk(primary)}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
