import { describe, expect, it } from "vitest";
import {
  EXPECTED_JOURNAL_COUNT,
  EXPECTED_JOURNAL_TAGS,
  EXPECTED_LAST_IDX,
} from "@/lib/ops/journal-tags";

describe("journal-tags (build-time imported)", () => {
  it("ships at least the migrations through the 0027_hub_social line", () => {
    expect(EXPECTED_JOURNAL_COUNT).toBeGreaterThanOrEqual(35);
    expect(EXPECTED_JOURNAL_TAGS).toContain("0000_init");
    expect(EXPECTED_JOURNAL_TAGS).toContain("0027_hub_social");
  });

  it("every shipped tag matches the NNNN_description.sql convention", () => {
    for (const tag of EXPECTED_JOURNAL_TAGS) {
      expect(tag).toMatch(/^\d{4}_[a-z0-9_]+$/);
    }
  });

  it("last idx matches count - 1 (Drizzle journal invariant)", () => {
    expect(EXPECTED_LAST_IDX).toBe(EXPECTED_JOURNAL_COUNT - 1);
  });
});
