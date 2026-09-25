#!/usr/bin/env node
/**
 * Fail CI if viewport meta blocks zoom or global CSS sets zoom-hostile touch-action.
 * Audit 2026-09-25 mobile menu / pinch-zoom plan.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function walk(dir, filter, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === "node_modules" || name.name === ".next" || name.name === "dist") continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, filter, out);
    else if (filter(name.name, full)) out.push(full);
  }
  return out;
}

const srcFiles = walk(path.join(root, "src"), (n) =>
  /\.(tsx?|jsx?|css|mjs|ts)$/.test(n),
);
const publicFiles = walk(path.join(root, "public"), (n) => /\.(html|css)$/.test(n));

const viewportBad =
  /user-scalable\s*=\s*no|maximum-scale\s*=\s*[0-4](\D|$)|maximum-scale\s*=\s*[0-4]\./i;
const touchBad = /touch-action\s*:\s*(none|pan-x|pan-y)\s*;/i;

for (const file of [...srcFiles, ...publicFiles]) {
  const text = fs.readFileSync(file, "utf8");
  if (viewportBad.test(text)) {
    failures.push(`viewport zoom block in ${path.relative(root, file)}`);
  }
  // Only flag global-looking touch-action in CSS / globals, not component-local comments
  if (file.endsWith(".css") && touchBad.test(text)) {
    failures.push(`touch-action zoom risk in ${path.relative(root, file)}`);
  }
}

// Root layout viewport export must not disable scaling
const layout = fs.readFileSync(path.join(root, "src/app/layout.tsx"), "utf8");
if (/userScalable\s*:\s*false|maximumScale\s*:\s*[0-4]\b/.test(layout)) {
  failures.push("src/app/layout.tsx viewport export disables zoom");
}

if (failures.length) {
  console.error("Zoom guard failed:\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
console.log("Zoom guard OK (no user-scalable=no / hostile maximum-scale / global touch-action).");
