import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ADVISORY_LOCK_KEY,
  BASELINE_SQL,
  appliedMigrationCount,
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

describe("db-maintain appliedMigrationCount — schema-aware (drizzle v0.36+ bookkeeping)", () => {
  it("returns 0 when the bookkeeping table does not exist (fresh DB)", async () => {
    const sql = makeSqlStub({
      // information_schema lookup returns no rows for __drizzle_migrations.
      information: [],
    });
    expect(await appliedMigrationCount(sql as Parameters<typeof appliedMigrationCount>[0])).toBe(0);
    expect(sql.unsafe).not.toHaveBeenCalled();
  });

  it("schema-qualifies the count when Drizzle writes into the dedicated 'drizzle' schema", async () => {
    // Round 2 in pg-core/dialect.cjs creates drizzle.__drizzle_migrations by
    // default; this is the path the docker-migrate smoke test exercises on a
    // fresh compose stack.
    const sql = makeSqlStub({
      information: [{ schema: "drizzle" }],
      drizzleCount: [{ n: 35 }],
    });
    expect(await appliedMigrationCount(sql as Parameters<typeof appliedMigrationCount>[0])).toBe(35);
    expect(sql.unsafe).toHaveBeenCalledWith(
      expect.stringContaining('"drizzle"."__drizzle_migrations"'),
    );
    // MUST NOT emit a bare-name count — that path is what fires the schema
    // mismatch on the smoke host.
    expect(sql.bareCount).not.toHaveBeenCalled();
  });

  it("falls back to the role's main schema when the table lives in public (legacy / lean configs)", async () => {
    const sql = makeSqlStub({
      information: [{ schema: "public" }],
      publicCount: [{ n: 12 }],
    });
    expect(await appliedMigrationCount(sql as Parameters<typeof appliedMigrationCount>[0])).toBe(12);
    expect(sql.unsafe).toHaveBeenCalledWith(
      expect.stringContaining('"public"."__drizzle_migrations"'),
    );
  });
});

/**
 * Build a postgres-shaped stub with the two query surfaces appliedMigrationCount
 * touches: the safe template-tag call (information_schema lookup) and the
 * `sql.unsafe(...)` schema-qualified count.
 */
function makeSqlStub({
  information,
  drizzleCount,
  publicCount,
}: {
  information: Array<{ schema: string }>;
  drizzleCount?: Array<{ n: number }>;
  publicCount?: Array<{ n: number }>;
}) {
  // The bare-name SELECT path is forbidden because it is the failure mode
  // this fix removes. Stub it out so a test that calls it fails loudly.
  const bareCount = vi.fn(async () => {
    throw new Error("bareName count must not be used (DBMAIN-001 regression)");
  });
  const stub = vi.fn(async () => information) as unknown as {
    (...args: unknown[]): Promise<unknown>;
    unsafe: ReturnType<typeof vi.fn>;
    bareCount: ReturnType<typeof vi.fn>;
  };
  stub.unsafe = vi.fn((query: string) => {
    // Match what the production code reads from the query, just enough to
    // route the result deterministically.
    if (query.includes('"drizzle"."__drizzle_migrations"')) {
      return Promise.resolve(drizzleCount ?? []);
    }
    if (query.includes('"public"."__drizzle_migrations"')) {
      return Promise.resolve(publicCount ?? []);
    }
    return Promise.resolve([]);
  });
  stub.bareCount = bareCount;
  return stub;
}