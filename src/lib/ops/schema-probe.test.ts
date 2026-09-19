import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock getDb before importing probeSchema — vitest hoists vi.mock so the
// dynamic import inside probeSchema resolves to our stub.
vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: () => false,
  getDb: () => {
    /* unreachable in this suite — Postgres is "off" */
    throw new Error("getDb was called when Postgres is off");
  },
}));

import { probeSchema } from "@/lib/ops/schema-probe";
import {
  EXPECTED_JOURNAL_COUNT,
  EXPECTED_JOURNAL_TAGS,
} from "@/lib/ops/journal-tags";

describe("probeSchema — Postgres off", () => {
  it("returns the no-DB view without calling getDb", async () => {
    const view = await probeSchema({ buildCommit: "abc1234" });
    expect(view.postgresConfigured).toBe(false);
    expect(view.applied.count).toBeNull();
    expect(view.applied.source).toBe("unknown");
    expect(view.journalInSync).toBe(true);
    expect(view.platformMeta).toBeNull();
    expect(view.criticalColumns.tasks.expected.length).toBeGreaterThan(0);
    expect(view.bootCommitMismatch).toBe(false);
    expect(view.expectedJournalCount).toBe(EXPECTED_JOURNAL_COUNT);
    expect(view.expectedJournalTags).toEqual(EXPECTED_JOURNAL_TAGS);
  });

  it("the probe's expected task column list includes 0027 additions", async () => {
    const view = await probeSchema({ buildCommit: "abc1234" });
    expect(view.criticalColumns.tasks.expected).toEqual(
      expect.arrayContaining(["notes", "mentioned_user_ids", "reactions", "updated_at"]),
    );
  });
});

describe("probeSchema — boot commit divergence detection", () => {
  const savedEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...savedEnv };
  });
  afterEach(() => {
    process.env = savedEnv;
  });

  it("does not flag mismatch when either side is 'unknown'", async () => {
    // Postgres is off in this suite, so platformMeta is null; the in-Postgres
    // branch is exercised by an integration test (db-migrate-smoke). We
    // document the no-flag fallback here.
    const view1 = await probeSchema({ buildCommit: "unknown" });
    expect(view1.bootCommitMismatch).toBe(false);
    const view2 = await probeSchema({ buildCommit: "abc1234" });
    expect(view2.bootCommitMismatch).toBe(false);
  });
});
