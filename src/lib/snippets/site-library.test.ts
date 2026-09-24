import { describe, expect, it, beforeEach } from "vitest";
import {
  defaultLibraryForBargainingUnitCode,
  unionPresetSeedsReferencePacks,
} from "./libraries";
import {
  getPreferredSnippetLibrary,
  resetPreferredSnippetLibrariesForTests,
  syncPreferredLibraryFromCollectionCode,
} from "./preferred-library";
import { ensureReferencePacksIfEmpty } from "./ensure-seeded";
import {
  resetSnippetMemoryForTests,
  memorySnippetStore,
} from "./memory-adapter";
import { resetSnippetStore, snippetStore } from "./store";
import { parseSnippetCsv, parseSnippetXlsx } from "./bulk-parse";
import { withTenantRlsScope } from "@/lib/db/rls-store";

describe("defaultLibraryForBargainingUnitCode", () => {
  it("maps Brand Kit support and FT/PT/academic codes", () => {
    expect(defaultLibraryForBargainingUnitCode("support")).toBe("caat-s-ft");
    expect(defaultLibraryForBargainingUnitCode("ft")).toBe("caat-s-ft");
    expect(defaultLibraryForBargainingUnitCode("pt")).toBe("caat-s-pt");
    expect(defaultLibraryForBargainingUnitCode("academic")).toBe("caat-a");
    expect(defaultLibraryForBargainingUnitCode("partial-load")).toBe("caat-a");
  });
});

describe("unionPresetSeedsReferencePacks", () => {
  it("seeds OPSEU/CAAT only", () => {
    expect(unionPresetSeedsReferencePacks("opseu")).toBe(true);
    expect(unionPresetSeedsReferencePacks("cupe")).toBe(false);
    expect(unionPresetSeedsReferencePacks(null)).toBe(false);
  });
});

describe("preferred library sync", () => {
  beforeEach(() => {
    resetPreferredSnippetLibrariesForTests();
  });

  it("updates preference from collection code without touching store rows", async () => {
    resetSnippetMemoryForTests();
    resetSnippetStore();
    const before = await snippetStore.list({ unionId: "union-b7p" });
    expect(before.length).toBeGreaterThan(0);

    const library = syncPreferredLibraryFromCollectionCode(
      "union-b7p",
      "local-7",
      "pt",
      "bu-pt",
    );
    expect(library).toBe("caat-s-pt");
    expect(
      getPreferredSnippetLibrary("union-b7p", "local-7", "bu-pt"),
    ).toBe("caat-s-pt");

    const after = await snippetStore.list({ unionId: "union-b7p" });
    expect(after.length).toBe(before.length);
  });
});

describe("ensureReferencePacksIfEmpty", () => {
  beforeEach(() => {
    resetSnippetMemoryForTests();
    resetSnippetStore();
  });

  it("no-ops when the union already has packs", async () => {
    const result = await ensureReferencePacksIfEmpty("union-b7p");
    expect(result.reason).toBe("already_populated");
    expect(result.seeded).toBe(false);
  });

  it("seeds an empty union from disk packs", async () => {
    await memorySnippetStore.resetUnion("union-empty-test");
    const result = await ensureReferencePacksIfEmpty("union-empty-test");
    expect(result.seeded).toBe(true);
    expect(result.restored).toBeGreaterThan(0);
    const list = await snippetStore.list({ unionId: "union-empty-test" });
    expect(list.length).toBe(result.restored);
  });
});

describe("withTenantRlsScope snippet methods", () => {
  it("wraps resetUnion and reseedReferencePacks from a unionId string", async () => {
    const resetUnion = async (unionId: string) => `reset:${unionId}`;
    const reseedReferencePacks = async (unionId: string) => `seed:${unionId}`;
    const wrapped = withTenantRlsScope({
      resetUnion,
      reseedReferencePacks,
    } as never) as {
      resetUnion(id: string): Promise<string>;
      reseedReferencePacks(id: string): Promise<string>;
    };
    await expect(wrapped.resetUnion("union-x")).resolves.toBe("reset:union-x");
    await expect(wrapped.reseedReferencePacks("union-x")).resolves.toBe(
      "seed:union-x",
    );
  });
});

describe("parseSnippetXlsx", () => {
  it("reads clauseRef/title/body from the first sheet", async () => {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Clauses");
    sheet.addRow(["clauseRef", "title", "body", "tags"]);
    sheet.addRow(["Art. 1", "Recognition", "The union is recognized.", "scope"]);
    const buffer = await wb.xlsx.writeBuffer();
    const rows = await parseSnippetXlsx(buffer as ArrayBuffer);
    expect(rows).toHaveLength(1);
    expect(rows[0].clauseRef).toBe("Art. 1");
    expect(rows[0].title).toBe("Recognition");
    expect(rows[0].body).toContain("recognized");
    expect(rows[0].tags).toEqual(["scope"]);
  });

  it("still parses CSV with the same headers", () => {
    const csv = `clauseRef,title,body,tags
Art. 2,Hours,Work week is 35 hours.,hours|ft`;
    const rows = parseSnippetCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].tags).toEqual(["hours", "ft"]);
  });
});
