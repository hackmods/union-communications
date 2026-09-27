import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const managedPath = /\/(?:templates\/(?:unionops-workplace-map(?:-example)?|unionops-steward-intake)\.csv|demo\/union-boards\/(?:board-tracker-sample|jhsc-member-list-sample)\.csv|assets\/ontario-board-posters\/(?:esa-employment-standards-poster|esa-poster-mltsd-2020|wsib-in-case-of-injury-form82)\.pdf)/;
const allowed = new Set([
  path.join(root, "src/lib/seo/public-routes.ts"),
  path.join(root, "src/lib/public-documents/registry.ts"),
]);
const failures = [];

function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name) && !allowed.has(full)) {
      const source = fs.readFileSync(full, "utf8");
      for (const [index, line] of source.split(/\r?\n/).entries()) {
        if (managedPath.test(line)) failures.push(`${path.relative(root, full)}:${index + 1}: direct managed-file URL`);
      }
    }
  }
}

const registry = fs.readFileSync(path.join(root, "src/lib/public-documents/registry.ts"), "utf8");
const materials = fs.readFileSync(path.join(root, "src/lib/constants/board-materials.ts"), "utf8");
for (const match of materials.matchAll(/documentSlug:\s*"([a-z0-9-]+)"/g)) {
  if (!registry.includes(`slug: "${match[1]}"`)) failures.push(`board-materials: registry key ${match[1]} is missing`);
}
visit(path.join(root, "src"));
if (failures.length) {
  console.error(`[public-documents] ${failures.join("\n")}`);
  process.exit(1);
}
console.log("[public-documents] registered links only");
