import { describe, expect, it } from "vitest";
import { buildSeedSnippets, loadSnippetSeedPackInputs } from "./seed-packs";
import { normalizeSnippetText } from "./text-normalize";

describe("snippet seed packs", () => {
  it("loads all four English CA / constitution CSVs", () => {
    const rows = loadSnippetSeedPackInputs();
    const byLibrary = Object.fromEntries(
      ["caat-a", "caat-s-ft", "caat-s-pt", "constitution"].map((id) => [
        id,
        rows.filter((r) => r.libraryId === id).length,
      ]),
    );
    expect(byLibrary["caat-a"]).toBeGreaterThan(90);
    expect(byLibrary["caat-s-ft"]).toBeGreaterThan(70);
    expect(byLibrary["caat-s-pt"]).toBeGreaterThan(80);
    expect(byLibrary.constitution).toBeGreaterThan(70);
    expect(rows.every((r) => r.locale === "en")).toBe(true);
  });

  it("keeps French accents on constitution rows", () => {
    const rows = loadSnippetSeedPackInputs().filter(
      (r) => r.libraryId === "constitution",
    );
    const name = rows.find((r) => r.clauseRef === "1.1");
    expect(name?.body).toContain("employés");
    expect(normalizeSnippetText(name!.body)).toContain("employés");
  });

  it("builds stable seed ids for the demo union", () => {
    const seeded = buildSeedSnippets("union-b7p");
    expect(seeded[0].id.startsWith("snip-pack-")).toBe(true);
    expect(new Set(seeded.map((s) => s.id)).size).toBe(seeded.length);
  });
});
