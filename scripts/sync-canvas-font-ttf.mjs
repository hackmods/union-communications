/**
 * Sync latin TTF siblings next to existing public/fonts woff2 files
 * for jsPDF / future OOXML embed (ADR-014 OFL). Uses wawoff2 decompress.
 *
 * Usage: node scripts/sync-canvas-font-ttf.mjs
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import wawoff2 from "wawoff2";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const FONTS = join(ROOT, "public", "fonts");

async function walkWoff2(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walkWoff2(full)));
    } else if (ent.name.endsWith(".woff2")) {
      out.push(full);
    }
  }
  return out;
}

function sfntExt(bytes) {
  if (bytes.length < 4) return ".ttf";
  const tag =
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag === "OTTO") return ".otf";
  return ".ttf";
}

async function main() {
  const files = await walkWoff2(FONTS);
  let written = 0;
  let skipped = 0;
  for (const woffPath of files) {
    const woff = await readFile(woffPath);
    const sfnt = await wawoff2.decompress(woff);
    const ext = sfntExt(sfnt);
    // Plan requires .ttf siblings for jsPDF; refuse CFF-only faces.
    if (ext !== ".ttf") {
      throw new Error(
        `Expected TrueType SFNT for ${relative(FONTS, woffPath)}, got ${ext}`,
      );
    }
    const ttfPath = woffPath.replace(/\.woff2$/i, ".ttf");
    try {
      const existing = await readFile(ttfPath);
      if (existing.length === sfnt.length) {
        skipped += 1;
        continue;
      }
    } catch {
      // missing — write
    }
    await writeFile(ttfPath, Buffer.from(sfnt));
    written += 1;
    const st = await stat(ttfPath);
    console.log(
      `wrote ${relative(ROOT, ttfPath)} (${st.size} bytes from ${relative(ROOT, woffPath)})`,
    );
  }
  console.log(`done: ${written} written, ${skipped} unchanged, ${files.length} woff2 sources`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
