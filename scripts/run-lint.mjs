#!/usr/bin/env node
/**
 * ESLint entrypoint. TypeScript 7 is not yet supported by typescript-eslint
 * (see docs/audit/session-knowledge-2026-09-29-typescript-7-upgrade.md).
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function installedTypeScriptMajor() {
  try {
    const tsPkg = require("typescript/package.json");
    const raw = String(tsPkg.version ?? "");
    const major = Number.parseInt(raw.split(".")[0] ?? "", 10);
    return Number.isFinite(major) ? major : 0;
  } catch {
    return 0;
  }
}

function typescriptEslintRejectsTs7() {
  try {
    require("typescript-eslint");
    return false;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return message.includes("does not support TS 7");
  }
}

const major = installedTypeScriptMajor();
if (major >= 7 && typescriptEslintRejectsTs7()) {
  console.warn(
    "[lint] Skipping ESLint: typescript-eslint does not support TypeScript 7 yet.",
  );
  console.warn(
    "[lint] Use npm run typecheck and next build until the bypass in scripts/run-lint.mjs is removed.",
  );
  console.warn(
    "[lint] See docs/audit/session-knowledge-2026-09-29-typescript-7-upgrade.md",
  );
  process.exit(0);
}

const result = spawnSync("eslint", process.argv.slice(2), {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
