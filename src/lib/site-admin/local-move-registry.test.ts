import { describe, expect, it } from "vitest";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import {
  isLocalMoveExcluded,
  uniqueLocalMoveUnionIdTables,
} from "./local-move-registry";

function dualKeyTablesFromSchema(): string[] {
  const found: string[] = [];
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const cols = getTableColumns(value);
    const hasUnion = Object.values(cols).some((c) => c.name === "union_id");
    const hasLocal = Object.values(cols).some((c) => c.name === "local_id");
    if (hasUnion && hasLocal) {
      found.push(getTableName(value));
    }
  }
  return [...new Set(found)].sort();
}

describe("local-move-registry completeness", () => {
  it("covers every Drizzle table with both union_id and local_id", () => {
    const allow = new Set(uniqueLocalMoveUnionIdTables());
    const missing: string[] = [];
    for (const table of dualKeyTablesFromSchema()) {
      if (allow.has(table) || isLocalMoveExcluded(table)) continue;
      missing.push(table);
    }
    expect(missing).toEqual([]);
  });

  it("does not list excluded tables in the cascade allowlist", () => {
    const allow = uniqueLocalMoveUnionIdTables();
    for (const table of allow) {
      expect(isLocalMoveExcluded(table)).toBe(false);
    }
  });
});
