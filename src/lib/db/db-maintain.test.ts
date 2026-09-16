import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADVISORY_LOCK_KEY,
  BASELINE_SQL,
  appVersion,
  gateDecision,
  parseJournal,
  pendingDataMigrations,
  sortDataMigrations,
} from "../../../docker/db-maintain.mjs";

describe("db-maintain pure helpers", () => {
  it("exports a fixed advisory lock key", () => {
    expect(typeof ADVISORY_LOCK_KEY).toBe("number");
    expect(Number.isInteger(ADVISORY_LOCK_KEY)).toBe(true);
  });

  it("parses the Drizzle journal into count and last idx", () => {
    const journal = { entries: [{ idx: 0 }, { idx: 1 }, { idx: 2 }] };
    expect(parseJournal(journal)).toEqual({ count: 3, lastIdx: 2 });
  });

  it("parses the shipped journal (0..N are contiguous)", () => {
    const journal = JSON.parse(
      readFileSync(
        join(process.cwd(), "src/lib/db/migrations/meta/_journal.json"),
        "utf8",
      ),
    );
    const { count, lastIdx } = parseJournal(journal);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(lastIdx).toBe(count - 1);
  });

  it("throws when the journal has no entries", () => {
    expect(() => parseJournal({})).toThrow();
    expect(() => parseJournal({ entries: [] })).toThrow();
  });

  it("sorts data migrations numerically and skips non-matching files", () => {
    const sorted = sortDataMigrations([
      "0010_x.sql",
      "notes.txt",
      "0002_b.sql",
      "0001_a.sql",
    ]);
    expect(sorted).toEqual([
      { version: 1, file: "0001_a.sql" },
      { version: 2, file: "0002_b.sql" },
      { version: 10, file: "0010_x.sql" },
    ]);
  });

  it("rejects duplicate data migration versions", () => {
    expect(() =>
      sortDataMigrations(["0001_a.sql", "0001_b.sql"]),
    ).toThrow(/duplicate data migration version 1/);
  });

  it("selects pending data migrations strictly above data_version", () => {
    const entries = [
      { version: 1, file: "0001_a.sql" },
      { version: 2, file: "0002_b.sql" },
      { version: 3, file: "0003_c.sql" },
    ];
    expect(pendingDataMigrations(entries, 0).map((e) => e.version)).toEqual([
      1, 2, 3,
    ]);
    expect(pendingDataMigrations(entries, 1).map((e) => e.version)).toEqual([2, 3]);
    expect(pendingDataMigrations(entries, 3)).toEqual([]);
  });

  it("decides the journal gate (ahead / behind / in-sync)", () => {
    expect(gateDecision({ appliedBefore: 5, expectedCount: 4 })).toBe("ahead");
    expect(gateDecision({ appliedBefore: 2, expectedCount: 4 })).toBe("behind");
    expect(gateDecision({ appliedBefore: 4, expectedCount: 4 })).toBe("in-sync");
  });

  it("baseline SQL is idempotent create/alter with a single-row guard", () => {
    expect(BASELINE_SQL).toContain("CREATE TABLE IF NOT EXISTS");
    expect(BASELINE_SQL).toContain("ADD COLUMN IF NOT EXISTS");
    expect(BASELINE_SQL).toContain('CHECK ("id" = 1)');
    expect(BASELINE_SQL).toContain("ON CONFLICT DO NOTHING");
    expect(BASELINE_SQL).toMatch(/ADD COLUMN IF NOT EXISTS "schema_version"/);
    expect(BASELINE_SQL).toMatch(/ADD COLUMN IF NOT EXISTS "data_version"/);
  });

  it("reads the repo package.json version", () => {
    expect(appVersion()).toBe("0.1.0");
  });
});