#!/usr/bin/env node
/**
 * Wrapper for pdf preview generation via vitest (needs jsPDF + path aliases).
 * Usage: npm run pdf:preview -- land-acknowledgement en
 * Templates: land-acknowledgement | far-sheet | hub-travel | board-checklist | steward-workspace
 */
import { spawnSync } from "node:child_process";

const template = process.argv[2] ?? "land-acknowledgement";
const locale = process.argv[3] ?? "en";

const result = spawnSync(
  "npx",
  ["vitest", "run", "-t", "pdf preview", "src/lib/export/pdf-preview.script.test.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PDF_PREVIEW_TEMPLATE: template,
      PDF_PREVIEW_LOCALE: locale,
    },
  },
);

process.exit(result.status ?? 1);
