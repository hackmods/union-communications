import sharp from "sharp";
import fs from "fs";
import path from "path";

const markSvg = fs.readFileSync("public/assets/unionops/logo-mark.svg");
const publicDir = "public";
const iconsDir = path.join(publicDir, "icons");
fs.mkdirSync(iconsDir, { recursive: true });

fs.copyFileSync(
  "public/assets/unionops/logo-mark.svg",
  path.join(publicDir, "favicon.svg"),
);

const pinned = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="44" cy="34" r="14" fill="none" stroke="#000" stroke-width="10"/>
  <path d="M12 14v20a14 14 0 0 0 28 0V14" fill="none" stroke="#000" stroke-width="10" stroke-linecap="butt" stroke-linejoin="round"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, "safari-pinned-tab.svg"), pinned);

const sizes = [
  { file: path.join(publicDir, "favicon-32.png"), size: 32 },
  { file: path.join(publicDir, "apple-touch-icon.png"), size: 180 },
  { file: path.join(iconsDir, "icon-192.png"), size: 192 },
  { file: path.join(iconsDir, "icon-512.png"), size: 512 },
];

for (const { file, size } of sizes) {
  await sharp(markSvg).resize(size, size).png().toFile(file);
}

const png32 = await sharp(markSvg).resize(32, 32).png().toBuffer();
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

await sharp(markSvg).resize(32, 32).png().toFile("src/app/icon.png");
console.log("Favicon suite generated.");
