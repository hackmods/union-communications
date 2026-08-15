import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import en from "../../../messages/en.json";
import {
  collectPublicCommsSmokeLiterals,
  extractSmokeCopyLiterals,
  flattenMessageLeaves,
  literalMissingFromCatalog,
  SMOKE_COPY_ALLOWLIST,
} from "./smoke-asserted-copy";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("COPY-002 smoke-asserted copy vs messages/en.json", () => {
  it("extracts plain getByText / name literals and skips regex", () => {
    const sample = `
      await expect(page.getByText("Solidarity.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Graphic Maker/i })).toBeVisible();
      await expect(page.getByText(\`Smoke \${stamp}\`)).toBeVisible();
      await expect(page.getByText("Edit")).toBeVisible();
    `;
    const literals = extractSmokeCopyLiterals(sample);
    expect(literals).toContain("Solidarity.");
    expect(literals).toContain("Get started");
    expect(literals).not.toContain("Graphic Maker");
    expect(literals.every((l) => !l.includes("${"))).toBe(true);
    expect(literals).not.toContain("Edit");
  });

  it("fails when a smoke-asserted public string is deleted from the catalog", () => {
    const catalog = flattenMessageLeaves(en).join("\n");
    expect(
      literalMissingFromCatalog("Local-first Comms", catalog),
    ).toBe(true);
    expect(literalMissingFromCatalog("Solidarity.", catalog)).toBe(false);
  });

  it("every public Comms smoke prose literal still appears in messages/en.json", () => {
    const catalog = flattenMessageLeaves(en).join("\n");
    const missing: string[] = [];

    for (const { file, literals } of collectPublicCommsSmokeLiterals(repoRoot)) {
      for (const literal of literals) {
        if (literalMissingFromCatalog(literal, catalog, SMOKE_COPY_ALLOWLIST)) {
          missing.push(`${file}: "${literal}"`);
        }
      }
    }

    expect(
      missing,
      [
        "Smoke specs assert catalog copy that is missing from messages/en.json.",
        "Update the spec, restore the string, or add a commented allowlist entry in smoke-asserted-copy.ts.",
        ...missing,
      ].join("\n"),
    ).toEqual([]);
  });
});
