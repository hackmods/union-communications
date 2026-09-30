import { describe, expect, it, beforeEach } from "vitest";
import { marketingEmailLookupKey } from "@/lib/email/marketing-consent";
import {
  memoryAddSuppression,
  memoryCreateList,
  memoryImportSubscribers,
  memoryIsSuppressed,
  memoryListConfirmed,
  resetOutreachListsMemory,
} from "./outreach-lists-memory";

describe("outreach list suppressions", () => {
  beforeEach(() => resetOutreachListsMemory());

  it("honours union-level suppressions", () => {
    const list = memoryCreateList({ unionId: "u1", name: "Org", slug: "org" });
    const lookup = marketingEmailLookupKey("a@example.com");
    expect(lookup).toBeTruthy();
    memoryAddSuppression({
      unionId: "u1",
      lookupKey: lookup!,
      email: "a@example.com",
      reason: "unsubscribe",
    });
    expect(memoryIsSuppressed("u1", lookup!)).toBe(true);
    const result = memoryImportSubscribers({
      unionId: "u1",
      listId: list.id,
      rows: [{ email: "a@example.com", locale: "en" }],
    });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it("keeps imported rows out of confirmed sends until confirmation", () => {
    const list = memoryCreateList({ unionId: "u1", name: "Org", slug: "org" });
    memoryImportSubscribers({
      unionId: "u1",
      listId: list.id,
      rows: [{ email: "b@example.com", locale: "en" }],
    });
    expect(memoryListConfirmed("u1", list.id)).toHaveLength(0);
  });
});
