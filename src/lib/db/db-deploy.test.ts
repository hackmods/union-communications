import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateRequiredShape,
  journalTailQuery,
  readAndValidateJournal,
  selectJournalSchema,
  validateJournalManifest,
} from "../../../docker/db-deploy.mjs";
import { generateDbContract } from "../../../scripts/generate-db-contract";

const migrationsDir = join(process.cwd(), "src/lib/db/migrations");

describe("database deploy journal contract", () => {
  it("accepts the shipped one-to-one contiguous journal", () => {
    const { entries } = readAndValidateJournal(migrationsDir);
    expect(entries.at(-1)).toMatchObject({
      idx: 52,
      tag: "0052_portal_archive_access",
    });
    expect(entries).toHaveLength(
      readdirSync(migrationsDir).filter((file) => /^\d{4}_.+\.sql$/.test(file)).length,
    );
  });

  it("rejects a SQL file missing from the journal before merge", () => {
    const journal = { entries: [{ idx: 0, when: 1, tag: "0000_init" }] };
    expect(() => validateJournalManifest(journal, ["0000_init.sql", "0001_gap.sql"]))
      .toThrow(/missing from journal: 0001_gap\.sql/);
  });

  it("rejects missing files, non-contiguous indexes, and timestamp reuse", () => {
    expect(() => validateJournalManifest(
      { entries: [{ idx: 0, when: 1, tag: "0000_init" }] },
      [],
    )).toThrow(/missing SQL file/);
    expect(() => validateJournalManifest(
      { entries: [{ idx: 1, when: 1, tag: "0000_init" }] },
      ["0000_init.sql"],
    )).toThrow(/idx must be contiguous/);
    expect(() => validateJournalManifest(
      {
        entries: [
          { idx: 0, when: 1, tag: "0000_init" },
          { idx: 1, when: 1, tag: "0001_next" },
        ],
      },
      ["0000_init.sql", "0001_next.sql"],
    )).toThrow(/timestamps must increase/);
  });
});

describe("database deploy journal schema qualification", () => {
  it("uses drizzle for a fresh database and reuses legacy public explicitly", () => {
    expect(selectJournalSchema([])).toBe("drizzle");
    expect(selectJournalSchema([{ schema: "drizzle" }])).toBe("drizzle");
    expect(selectJournalSchema([{ schema: "public" }])).toBe("public");
  });

  it("refuses ambiguous journal tables instead of trusting search_path", () => {
    expect(() => selectJournalSchema([
      { schema: "public" },
      { schema: "drizzle" },
    ])).toThrow(/ambiguous __drizzle_migrations/);
  });

  it("always schema-qualifies the tail proof", () => {
    expect(journalTailQuery("drizzle")).toContain(
      'FROM "drizzle"."__drizzle_migrations"',
    );
    expect(journalTailQuery("public")).toContain(
      'FROM "public"."__drizzle_migrations"',
    );
    expect(journalTailQuery("drizzle")).not.toMatch(/FROM "__drizzle_migrations"/);
  });
});

describe("required database shape", () => {
  const contract = {
    version: 1,
    schema: "public",
    tables: [{
      name: "tasks",
      columns: [
        { name: "id", dataType: "text", notNull: true },
        { name: "notes", dataType: "text", notNull: false },
      ],
    }],
    roles: [{ name: "unionops_app", superuser: false, bypassRls: false }],
    policies: [{ schema: "public", table: "tasks", name: "tasks_tenant_isolation" }],
  };

  const completeCatalog = {
    columns: [
      { table_schema: "public", table_name: "tasks", column_name: "id", data_type: "text", is_nullable: "NO" },
      { table_schema: "public", table_name: "tasks", column_name: "notes", data_type: "text", is_nullable: "YES" },
    ],
    roles: [{ name: "unionops_app", superuser: false, bypassRls: false }],
    rls: [{ schema: "public", table: "tasks", enabled: true }],
    policies: [{ schema: "public", table: "tasks", name: "tasks_tenant_isolation" }],
  };

  it("accepts the required subset and ignores additive database shape", () => {
    expect(evaluateRequiredShape(contract, completeCatalog)).toEqual([]);
  });

  it("fails when critical DDL or security invariants are missing", () => {
    const broken = {
      ...completeCatalog,
      columns: completeCatalog.columns.filter((column) => column.column_name !== "notes"),
      roles: [{ name: "unionops_app", superuser: false, bypassRls: true }],
      rls: [{ schema: "public", table: "tasks", enabled: false }],
      policies: [],
    };
    expect(evaluateRequiredShape(contract, broken)).toEqual(expect.arrayContaining([
      "missing column public.tasks.notes",
      "role unionops_app bypassRls=true; expected false",
      "RLS is not enabled on public.tasks",
      "missing RLS policy public.tasks.tasks_tenant_isolation",
    ]));
  });

  it("generates the image contract from all Drizzle tables and 0027 columns", () => {
    const generated = generateDbContract();
    const tasks = generated.tables.find((table) => table.name === "tasks");
    expect(generated.tables.length).toBeGreaterThan(50);
    expect(tasks?.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(["notes", "mentioned_user_ids", "reactions", "updated_at"]),
    );
    expect(generated.policies).toContainEqual({
      schema: "public",
      table: "time_worker_groups",
      name: "time_worker_groups_tenant_isolation",
    });
  });

  it("keeps released migration 0035 unchanged while appending reconciliation", () => {
    const sql = readFileSync(
      join(migrationsDir, "0036_verified_boot_reconcile.sql"),
      "utf8",
    );
    expect(sql).toContain('ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "notes"');
    expect(sql).toContain('DROP TABLE IF EXISTS "platform_meta"');
  });
});
