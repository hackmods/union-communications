import { describe, expect, it, beforeEach } from "vitest";
import {
  importOutreachSubscribers,
  parseOutreachImportCsv,
} from "./outreach-import";
import { memoryCreateList, resetOutreachListsMemory } from "./outreach-lists-memory";

describe("outreach CSV import", () => {
  beforeEach(() => {
    resetOutreachListsMemory();
  });

  it("parses email and locale columns", () => {
    const rows = parseOutreachImportCsv("email,locale\na@example.com,fr\nbad\nb@example.com,en");
    expect(rows).toEqual([
      { email: "a@example.com", locale: "fr" },
      { email: "b@example.com", locale: "en" },
    ]);
  });

  it("imports rows as pending only", async () => {
    const list = memoryCreateList({ unionId: "u1", name: "National", slug: "national" });
    const result = await importOutreachSubscribers({
      unionId: "u1",
      listId: list.id,
      rows: [{ email: "member@example.com", locale: "en" }],
      dryRun: false,
      attestation: "I attest these addresses opted in with the approved notice.",
      actorId: "admin-1",
      requestId: "req-1",
      rls: { unionId: "u1", crossLocal: true, mfaVerified: true },
    });
    expect(result).toMatchObject({ imported: 1, pendingOnly: true });
  });
});
