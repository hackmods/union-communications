import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.join(__dirname, "../public/assets/caat-opseu");

function buildSvg({ pngName, fillLabel, outName }) {
  const png = fs.readFileSync(path.join(assetDir, pngName));
  const b64 = png.toString("base64");
  // Mark artboard is 292×280. Wordmark stacked and centered over the mark.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 292 280" width="292" height="280" role="img" aria-label="OPSEU SEFPO mark with wordmark slit out">
  <title>OPSEU SEFPO — slit mark (${fillLabel})</title>
  <desc>Official bars + trillium mark with OPSEU / SEFPO cut through as negative space.</desc>
  <defs>
    <mask id="slit" maskUnits="userSpaceOnUse" x="0" y="0" width="292" height="280">
      <rect width="292" height="280" fill="#fff"/>
      <g fill="#000"
         font-family="Arial Black, Impact, Helvetica Neue, Arial, sans-serif"
         font-weight="900"
         font-style="italic"
         letter-spacing="-1"
         text-anchor="middle">
        <text x="146" y="128" font-size="64">OPSEU</text>
        <text x="146" y="210" font-size="64">SEFPO</text>
      </g>
    </mask>
  </defs>
  <image
    width="292"
    height="280"
    href="data:image/png;base64,${b64}"
    mask="url(#slit)"
    preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
  const out = path.join(assetDir, outName);
  fs.writeFileSync(out, svg, "utf8");
  console.log("wrote", out, `(${(svg.length / 1024).toFixed(1)} KB)`);
}

buildSvg({
  pngName: "logo-mark.png",
  fillLabel: "blue",
  outName: "opseu-mark-slit-blue.svg",
});
buildSvg({
  pngName: "logo-mark-white.png",
  fillLabel: "white",
  outName: "opseu-mark-slit-white.svg",
});
