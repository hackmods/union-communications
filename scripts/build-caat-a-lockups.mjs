/**
 * Rebuild CAAT-A lockups as clean vector SVGs.
 * Official OPSEU mark (tinted) + outlined Arial Black type.
 * Replaces path-traced rasters until faculty EPS lands.
 *
 * Run: node scripts/build-caat-a-lockups.mjs
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";

const OUT = join("public", "assets", "caat-a");
const INK = "#B22E2C";
const WHITE = "#FFFFFF";
const COALITION = "#003DA5";
const REVERSE = "#231F20";

const FONT_CANDIDATES = [
  "C:/Windows/Fonts/ariblk.ttf",
  "C:/Windows/Fonts/arialbd.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Black.ttf",
];

function loadFont() {
  for (const path of FONT_CANDIDATES) {
    if (existsSync(path)) {
      console.log("font", path);
      return opentype.loadSync(path);
    }
  }
  throw new Error("No suitable bold sans font found for lockup outlines");
}

const font = loadFont();

function textPath(text, x, y, fontSize, fill, tracking = 0) {
  if (!tracking) {
    return `<path fill="${fill}" d="${font.getPath(text, x, y, fontSize).toPathData(2)}"/>`;
  }
  let cursor = x;
  const parts = [];
  for (const ch of text) {
    parts.push(font.getPath(ch, cursor, y, fontSize).toPathData(2));
    cursor += font.getAdvanceWidth(ch, fontSize) + tracking;
  }
  return `<path fill="${fill}" d="${parts.join(" ")}"/>`;
}

async function tintMark(srcPath, hex) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  // Crop opaque content tightly
  let minX = info.width,
    minY = info.height,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 2;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(info.width, maxX + pad + 1) - left;
  const height = Math.min(info.height, maxY + pad + 1) - top;
  const buf = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
  return { buf, width, height };
}

function dataUri(buf) {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function horizontalLockup({ inkMarkUri, markW, markH, ink, width, height, aria }) {
  const markDisplayH = 56;
  const markDisplayW = Math.round((markW / markH) * markDisplayH);
  const textX = markDisplayW + 10;
  const opseuBlockW = 78;
  const div1 = textX + opseuBlockW + 8;
  const collegeX = div1 + 12;
  const collegeBlockW = 168;
  const div2 = collegeX + collegeBlockW + 8;
  const frenchX = div2 + 12;
  const vbW = width ?? frenchX + 280;
  const vbH = height ?? 76;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="0 0 ${vbW} ${vbH}" role="img" aria-label="${aria}">
  <image href="${inkMarkUri}" x="8" y="${(vbH - markDisplayH) / 2}" width="${markDisplayW}" height="${markDisplayH}" preserveAspectRatio="xMidYMid meet"/>
  <g>
    ${textPath("OPSEU", textX, 30, 14, ink, 0.6)}
    ${textPath("SEFPO", textX, 50, 14, ink, 0.6)}
  </g>
  <rect x="${div1}" y="12" width="2.5" height="52" fill="${ink}"/>
  <g>
    ${textPath("COLLEGE", collegeX, 30, 22, ink, 1.4)}
    ${textPath("FACULTY", collegeX, 56, 22, ink, 1.4)}
  </g>
  <rect x="${div2}" y="12" width="2.5" height="52" fill="${ink}"/>
  <g>
    ${textPath("PERSONNEL SCOLAIRE", frenchX, 30, 16, ink, 0.9)}
    ${textPath("DES COLLÈGES", frenchX, 56, 16, ink, 0.9)}
  </g>
</svg>
`;
}

function stackedPlate({ plate, markUri, markW, markH, ink = WHITE, aria }) {
  const width = 200;
  const height = 100;
  const markDisplayH = 28;
  const markDisplayW = Math.round((markW / markH) * markDisplayH);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${aria}">
  <rect width="${width}" height="${height}" fill="${plate}"/>
  <image href="${markUri}" x="8" y="8" width="${markDisplayW}" height="${markDisplayH}" preserveAspectRatio="xMidYMid meet"/>
  <g>
    ${textPath("OPSEU", 8 + markDisplayW + 6, 20, 10, ink, 0.4)}
    ${textPath("SEFPO", 8 + markDisplayW + 6, 32, 10, ink, 0.4)}
  </g>
  <line x1="100" y1="6" x2="100" y2="88" stroke="${ink}" stroke-width="1.25"/>
  <g>
    ${textPath("COLLEGE", 10, 58, 15, ink, 0.8)}
    ${textPath("FACULTY", 10, 76, 15, ink, 0.8)}
  </g>
  <g>
    ${textPath("PERSONNEL", 110, 28, 9, ink, 0.35)}
    ${textPath("SCOLAIRE", 110, 42, 9, ink, 0.35)}
    ${textPath("DES COLLÈGES", 110, 56, 9, ink, 0.35)}
  </g>
  <line x1="10" y1="84" x2="190" y2="84" stroke="${ink}" stroke-width="1"/>
</svg>
`;
}

const markSrc = join("public", "assets", "caat-opseu", "logo-mark.png");
const redMark = await tintMark(markSrc, INK);
const whiteMark = await tintMark(markSrc, WHITE);
const redUri = dataUri(redMark.buf);
const whiteUri = dataUri(whiteMark.buf);

const files = {
  "logo-lockup-color.svg": horizontalLockup({
    inkMarkUri: redUri,
    markW: redMark.width,
    markH: redMark.height,
    ink: INK,
    aria: "OPSEU SEFPO College Faculty colour lockup",
  }),
  "logo-lockup-one-color.svg": horizontalLockup({
    inkMarkUri: redUri,
    markW: redMark.width,
    markH: redMark.height,
    ink: INK,
    width: 620,
    height: 72,
    aria: "OPSEU SEFPO College Faculty one-colour lockup",
  }),
  "logo-lockup-on-primary-knockout.svg": stackedPlate({
    plate: INK,
    markUri: whiteUri,
    markW: whiteMark.width,
    markH: whiteMark.height,
    aria: "OPSEU SEFPO College Faculty white lockup on faculty red",
  }),
  "logo-lockup-on-primary.svg": stackedPlate({
    plate: INK,
    markUri: whiteUri,
    markW: whiteMark.width,
    markH: whiteMark.height,
    aria: "OPSEU SEFPO College Faculty on faculty red plate",
  }),
  "logo-lockup-on-coalition.svg": stackedPlate({
    plate: COALITION,
    markUri: whiteUri,
    markW: whiteMark.width,
    markH: whiteMark.height,
    aria: "OPSEU SEFPO College Faculty white lockup on coalition blue",
  }),
  "logo-lockup-reverse.svg": stackedPlate({
    plate: REVERSE,
    markUri: whiteUri,
    markW: whiteMark.width,
    markH: whiteMark.height,
    aria: "OPSEU SEFPO College Faculty white lockup reverse",
  }),
};

for (const [name, body] of Object.entries(files)) {
  const path = join(OUT, name);
  writeFileSync(path, body, "utf8");
  console.log("wrote", path, body.length, "bytes");
}
