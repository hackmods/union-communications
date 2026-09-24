import { describe, expect, it } from "vitest";
import {
  looksLikeUtf8Mojibake,
  normalizeSnippetText,
  repairUtf8Mojibake,
} from "./text-normalize";
import { parseSnippetCsv } from "./bulk-parse";

describe("repairUtf8Mojibake", () => {
  it("repairs UTF-8 bytes that were mis-decoded as Latin-1", () => {
    // "employés" UTF-8 (C3 A9) read as Latin-1 → "employÃ©s"
    const mangled = "Syndicat des employÃ©s de la fonction publique";
    expect(looksLikeUtf8Mojibake(mangled)).toBe(true);
    expect(repairUtf8Mojibake(mangled)).toBe(
      "Syndicat des employés de la fonction publique",
    );
  });

  it("leaves correct French accents alone", () => {
    const good = "Syndicat des employés — Métis members";
    expect(looksLikeUtf8Mojibake(good)).toBe(false);
    expect(repairUtf8Mojibake(good)).toBe(good);
  });

  it("leaves cent signs alone (kilometrage rates)", () => {
    expect(repairUtf8Mojibake("40.0¢ South / 41.0¢ North")).toBe(
      "40.0¢ South / 41.0¢ North",
    );
  });
});

describe("decodeSnippetFileBytes", () => {
  it("decodes UTF-8 buffers with accents", async () => {
    const { decodeSnippetFileBytes } = await import("./text-normalize");
    const bytes = new TextEncoder().encode("employés");
    expect(decodeSnippetFileBytes(bytes)).toBe("employés");
  });

  it("falls back to Windows-1252 for legacy Excel bytes", async () => {
    const { decodeSnippetFileBytes } = await import("./text-normalize");
    // Windows-1252: é = 0xE9 (invalid as UTF-8 leading byte alone in multi-byte sense when followed oddly)
    // "café" in windows-1252: 63 61 66 E9
    const bytes = Uint8Array.from([0x63, 0x61, 0x66, 0xe9]);
    expect(decodeSnippetFileBytes(bytes)).toBe("café");
  });
});

describe("normalizeSnippetText", () => {
  it("flattens smart quotes and dashes to plain ASCII punctuation", () => {
    expect(
      normalizeSnippetText("The Member\u2019s \u201Cright\u201D \u2014 voice\u2026"),
    ).toBe("The Member's \"right\" - voice...");
  });

  it("repairs mojibake then keeps the recovered accents", () => {
    expect(normalizeSnippetText("employÃ©s and MÃ©tis")).toBe("employés and Métis");
  });

  it("strips BOM and collapses Windows newlines", () => {
    expect(normalizeSnippetText("\uFEFFline one\r\nline two  ")).toBe(
      "line one\nline two",
    );
  });
});

describe("parseSnippetCsv applies text normalize", () => {
  it("repairs mojibake in clause bodies on import", () => {
    const csv = [
      "clauseRef,title,body,tags",
      '1.1,Name,"Syndicat des employÃ©s de l\'Ontario.",OPSEU|Constitution',
    ].join("\n");
    const rows = parseSnippetCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toContain("employés");
    expect(rows[0].body).not.toContain("Ã");
  });
});
