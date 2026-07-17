/**
 * Generate favicon / PWA / Apple / OG share-card suite from host brand colours.
 *
 * Plate = config/host-brand.json primary (or PLATFORM orange).
 * Glyph = black or white via the same contrast rule as pickContrastingInk.
 * favicon.svg also adapts with prefers-color-scheme for dark browser chrome.
 * og-image.png is the crawler-safe share card (Twitter/Facebook/LinkedIn).
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
const PLATFORM_ACCENT = "#9A3412";

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

function buildOgImageSvg(primary, accent) {
  // Black UO mark on white plate — matches opengraph-image.tsx
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="72" y="64" width="96" height="96" rx="21" fill="#FFFFFF"/>
  <g transform="translate(84 76)">
    <circle cx="49.5" cy="38.25" r="15.75" fill="none" stroke="#1A1A1A" stroke-width="11.25"/>
    <path d="M13.5 15.75v22.5a15.75 15.75 0 0 0 31.5 0V15.75" fill="none" stroke="#1A1A1A" stroke-width="11.25" stroke-linecap="butt" stroke-linejoin="round" opacity="0.88"/>
  </g>
  <text x="196" y="132" fill="#FFFFFF" font-family="system-ui,Segoe UI,sans-serif" font-size="64" font-weight="800" letter-spacing="-1">UnionOps</text>
  <text x="72" y="320" fill="#FFFFFF" font-family="system-ui,Segoe UI,sans-serif" font-size="48" font-weight="700">Solidarity.</text>
  <text x="72" y="372" fill="#FFFFFF" font-family="system-ui,Segoe UI,sans-serif" font-size="28" opacity="0.92">Free tools for union stewards and officers. Comms stay on your device.</text>
  <line x1="72" y1="520" x2="1128" y2="520" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  <text x="72" y="568" fill="#FFFFFF" font-family="system-ui,Segoe UI,sans-serif" font-size="22" letter-spacing="1.8" opacity="0.95">FREE TOOLS FOR UNION LOCALS</text>
  <text x="1128" y="568" fill="#FFFFFF" font-family="system-ui,Segoe UI,sans-serif" font-size="22" letter-spacing="1.8" opacity="0.95" text-anchor="end">UNIONOPS.ORG</text>
</svg>
`;
}

function readHostBrand() {
  const brandPath = path.join(root, "config", "host-brand.json");
  try {
    const raw = JSON.parse(fs.readFileSync(brandPath, "utf8"));
    const primary = String(raw.primaryColor || "").toUpperCase();
    const accent = String(raw.accentColor || "").toUpperCase();
    return {
      primary: HEX.test(primary) ? primary : PLATFORM_PRIMARY,
      accent: HEX.test(accent) ? accent : PLATFORM_ACCENT,
    };
  } catch {
    return { primary: PLATFORM_PRIMARY, accent: PLATFORM_ACCENT };
  }
}

/** Build a multi-resolution ICO (PNG-compressed images). */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + 16 * count;
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function main() {
  const { primary, accent } = readHostBrand();
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
    { file: path.join(iconsDir, "icon-48.png"), size: 48 },
    { file: path.join(iconsDir, "icon-192.png"), size: 192 },
    { file: path.join(iconsDir, "icon-512.png"), size: 512 },
    { file: path.join(root, "src", "app", "icon.png"), size: 32 },
  ];

  for (const { file, size } of sizes) {
    await sharp(staticBuf).resize(size, size).png().toFile(file);
  }

  // Multi-size ICO: 48 (Google Search) + 32 (tabs)
  const png48 = await sharp(staticBuf).resize(48, 48).png().toBuffer();
  const png32 = await sharp(staticBuf).resize(32, 32).png().toBuffer();
  const icoBuf = buildIco([
    { size: 48, buffer: png48 },
    { size: 32, buffer: png32 },
  ]);
  // public/ for metadata icons; src/app/ so App Router never serves a stale Create-Next-App ico
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuf);
  fs.writeFileSync(path.join(root, "src", "app", "favicon.ico"), icoBuf);

  // Static OG/Twitter share card — crawlers hit this path with a file extension
  const ogSvg = buildOgImageSvg(primary, accent);
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(publicDir, "og-image.png"));

  console.log(
    `Favicon + OG suite generated (primary ${primary}, accent ${accent}, glyph ${pickContrastingInk(primary)}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
