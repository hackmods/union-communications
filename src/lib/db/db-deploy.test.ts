import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateRequiredShape,
  pgTypesCompatible,
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
      idx: 94,
      tag: "0094_outreach_lists_admin_rls",
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
    tablePrivileges: [],
  };

  const completeCatalog = {
    columns: [
      { table_schema: "public", table_name: "tasks", column_name: "id", data_type: "text", is_nullable: "NO" },
      { table_schema: "public", table_name: "tasks", column_name: "notes", data_type: "text", is_nullable: "YES" },
    ],
    roles: [{ name: "unionops_app", superuser: false, bypassRls: false }],
    rls: [{ schema: "public", table: "tasks", enabled: true }],
    policies: [{ schema: "public", table: "tasks", name: "tasks_tenant_isolation" }],
    tablePrivileges: [],
  };

  it("accepts the required subset and ignores additive database shape", () => {
    expect(evaluateRequiredShape(contract, completeCatalog)).toEqual([]);
  });

  it("treats bigserial/bigint and text[]/ARRAY as compatible", () => {
    expect(pgTypesCompatible("bigserial", "bigint")).toBe(true);
    expect(pgTypesCompatible("text[]", "ARRAY")).toBe(true);
    expect(pgTypesCompatible("text", "integer")).toBe(false);
    const arrayContract = {
      ...contract,
      tables: [{
        name: "platform_incidents",
        columns: [
          { name: "data_categories", dataType: "text[]", notNull: true },
          { name: "sequence", dataType: "bigserial", notNull: true },
        ],
      }],
      policies: [],
    };
    const arrayCatalog = {
      columns: [
        { table_schema: "public", table_name: "platform_incidents", column_name: "data_categories", data_type: "ARRAY", is_nullable: "NO" },
        { table_schema: "public", table_name: "platform_incidents", column_name: "sequence", data_type: "bigint", is_nullable: "NO" },
      ],
      roles: completeCatalog.roles,
      rls: [{ schema: "public", table: "platform_incidents", enabled: true }],
      policies: [],
    };
    expect(evaluateRequiredShape(arrayContract, arrayCatalog)).toEqual([]);
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

  it("fails when MFA app-role DML grants are missing", () => {
    const withPrivs = {
      ...contract,
      tablePrivileges: [
        {
          schema: "public",
          table: "mfa_pending_enrollments",
          grantee: "unionops_app",
          privileges: ["SELECT", "INSERT", "UPDATE"],
          revokeDelete: true,
        },
      ],
    };
    expect(evaluateRequiredShape(withPrivs, completeCatalog)).toEqual(
      expect.arrayContaining([
        "missing privilege SELECT on public.mfa_pending_enrollments for unionops_app",
        "missing privilege INSERT on public.mfa_pending_enrollments for unionops_app",
        "missing privilege UPDATE on public.mfa_pending_enrollments for unionops_app",
      ]),
    );
    const granted = {
      ...completeCatalog,
      tablePrivileges: [
        {
          schema: "public",
          table: "mfa_pending_enrollments",
          grantee: "unionops_app",
          privilege: "SELECT",
        },
        {
          schema: "public",
          table: "mfa_pending_enrollments",
          grantee: "unionops_app",
          privilege: "INSERT",
        },
        {
          schema: "public",
          table: "mfa_pending_enrollments",
          grantee: "unionops_app",
          privilege: "UPDATE",
        },
      ],
    };
    expect(evaluateRequiredShape(withPrivs, granted)).toEqual([]);
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
    expect(generated.tablePrivileges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "mfa_pending_enrollments",
          grantee: "unionops_app",
          privileges: ["SELECT", "INSERT", "UPDATE"],
          revokeDelete: true,
        }),
      ]),
    );
    const users = generated.tables.find((table) => table.name === "users");
    expect(users?.columns.map((column) => column.name)).toContain(
      "mfa_reenroll_grace_until",
    );
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
