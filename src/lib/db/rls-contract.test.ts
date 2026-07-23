import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_DB_ROLE,
  APP_ROLE_MIGRATION,
  RLS_SESSION_VARS,
  RLS_TENANT_POLICIES,
} from "@/lib/db/rls-contract";

const migrationsDir = join(process.cwd(), "src/lib/db/migrations");

function readMigration(name: string): string {
  return readFileSync(join(migrationsDir, name), "utf8");
}

describe("RLS policy contract (no live DB)", () => {
  it("lists session GUCs used by applyRlsContext / policies", () => {
    expect(RLS_SESSION_VARS).toEqual([
      "app.current_union_id",
      "app.current_local_id",
      "app.current_cross_local",
    ]);
  });

  it("migration SQL ENABLE + CREATE POLICY for every contracted table", () => {
    const byMigration = new Map<string, string>();
    for (const row of RLS_TENANT_POLICIES) {
      if (!byMigration.has(row.migration)) {
        byMigration.set(row.migration, readMigration(row.migration));
      }
      const sql = byMigration.get(row.migration)!;
      expect(sql).toContain(
        `ALTER TABLE ${row.table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(sql).toMatch(
        new RegExp(`CREATE POLICY\\s+${row.policy}\\s+ON\\s+${row.table}`),
      );
      for (const guc of ["app.current_union_id", "app.current_local_id"]) {
        expect(sql).toContain(guc);
      }
    }
  });

  it("0008 creates non-owner app role without BYPASSRLS", () => {
    const sql = readMigration(APP_ROLE_MIGRATION);
    const codeOnly = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(codeOnly).toContain(`CREATE ROLE ${APP_DB_ROLE}`);
    expect(codeOnly).toMatch(/NOBYPASSRLS/);
    expect(codeOnly).toMatch(/NOSUPERUSER/);
    expect(codeOnly).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public",
    );
    expect(codeOnly).toMatch(/GRANT CONNECT ON DATABASE/);
    // After removing NOBYPASSRLS tokens, no affirmative BYPASSRLS remains in DDL.
    expect(codeOnly.replaceAll("NOBYPASSRLS", "")).not.toMatch(/\bBYPASSRLS\b/);
  });

  it("journal includes app role migration before tasks", () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    const tags = journal.entries.map((e) => e.tag);
    expect(tags).toContain("0008_app_role");
    expect(tags.indexOf("0008_app_role")).toBeLessThan(
      tags.indexOf("0009_tasks"),
    );
  });
});
