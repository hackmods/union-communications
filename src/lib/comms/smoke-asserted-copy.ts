/**
 * COPY-002 — extract plain-string Playwright assertions from smoke specs
 * so unit tests can require those strings still exist in messages/en.json.
 */

import fs from "node:fs";
import path from "node:path";

/** Public Comms smoke specs (not Hub auth / Portal seed-data suites). */
export const PUBLIC_COMMS_SMOKE_SPECS = [
  "e2e/smoke.spec.ts",
  "e2e/builders.smoke.spec.ts",
  "e2e/workshop.smoke.spec.ts",
  "e2e/seo.smoke.spec.ts",
  "e2e/tools.export.smoke.spec.ts",
] as const;

/**
 * Intentional non-catalog literals. Keep this list short and commented.
 * Prefer restoring catalog copy over growing the allowlist.
 */
export const SMOKE_COPY_ALLOWLIST = new Set([
  // Bibliography row title from COMMS_SOURCES (registry), not messages/*.json
  "OPSEU / SEFPO graphics, logos & letterhead",
]);

const ROLE_NAME_LITERAL =
  /\b(?:getByText|getByLabel|getByPlaceholder|getByAltText)\(\s*(["'])([^"'\\]*(?:\\.[^"'\\]*)*)\1/g;

const NAME_OPTION_LITERAL =
  /\bname\s*:\s*(["'])([^"'\\]*(?:\\.[^"'\\]*)*)\1/g;

function looksLikeProseLiteral(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 8 && !/\s/.test(trimmed)) return false;
  if (trimmed.includes("${")) return false;
  // Reject strings that look like hand-written regex fragments inside quotes
  if (/[*+?^${}()|[\]\\]/.test(trimmed)) return false;
  return true;
}

export function extractSmokeCopyLiterals(source: string): string[] {
  const found = new Set<string>();

  for (const re of [ROLE_NAME_LITERAL, NAME_OPTION_LITERAL]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const raw = match[2] ?? "";
      const unescaped = raw.replace(/\\(['"])/g, "$1");
      if (looksLikeProseLiteral(unescaped)) found.add(unescaped);
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

export function collectPublicCommsSmokeLiterals(
  repoRoot: string,
): { file: string; literals: string[] }[] {
  return PUBLIC_COMMS_SMOKE_SPECS.map((rel) => {
    const abs = path.join(repoRoot, rel);
    const source = fs.readFileSync(abs, "utf8");
    return { file: rel, literals: extractSmokeCopyLiterals(source) };
  });
}

export function flattenMessageLeaves(
  value: unknown,
  out: string[] = [],
): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenMessageLeaves(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      flattenMessageLeaves(child, out);
    }
  }
  return out;
}

export function literalMissingFromCatalog(
  literal: string,
  catalogText: string,
  allowlist: Set<string> = SMOKE_COPY_ALLOWLIST,
): boolean {
  if (allowlist.has(literal)) return false;
  return !catalogText.includes(literal);
}
