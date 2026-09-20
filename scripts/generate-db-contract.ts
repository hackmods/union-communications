#!/usr/bin/env tsx
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../src/lib/db/schema/index";
import {
  APP_DB_ROLE,
  RLS_TENANT_POLICIES,
} from "../src/lib/db/rls-contract";

export type DbRequiredShape = {
  version: 1;
  generatedFrom: string;
  schema: "public";
  tables: Array<{
    name: string;
    columns: Array<{ name: string; dataType: string; notNull: boolean }>;
  }>;
  roles: Array<{ name: string; superuser: boolean; bypassRls: boolean }>;
  policies: Array<{ schema: "public"; table: string; name: string }>;
};

function isTable(value: unknown): boolean {
  try {
    return Boolean(getTableConfig(value as Parameters<typeof getTableConfig>[0]).name);
  } catch {
    return false;
  }
}

export function generateDbContract(): DbRequiredShape {
  const tablesByName = new Map<string, DbRequiredShape["tables"][number]>();
  for (const value of Object.values(schema).filter(isTable)) {
    const config = getTableConfig(value as Parameters<typeof getTableConfig>[0]);
    if (config.schema && config.schema !== "public") {
      throw new Error(`unsupported application schema ${config.schema}.${config.name}`);
    }
    const table = {
      name: config.name,
      columns: config.columns
        .map((column) => ({
          name: column.name,
          dataType: column.getSQLType(),
          notNull: column.notNull,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
    const previous = tablesByName.get(table.name);
    if (previous && JSON.stringify(previous) !== JSON.stringify(table)) {
      throw new Error(`conflicting Drizzle definitions for table ${table.name}`);
    }
    tablesByName.set(table.name, table);
  }

  return {
    version: 1,
    generatedFrom: "src/lib/db/schema/index.ts + src/lib/db/rls-contract.ts",
    schema: "public",
    tables: [...tablesByName.values()].sort((a, b) => a.name.localeCompare(b.name)),
    roles: [{ name: APP_DB_ROLE, superuser: false, bypassRls: false }],
    policies: RLS_TENANT_POLICIES.map((policy) => ({
      schema: "public" as const,
      table: policy.table,
      name: policy.policy,
    })).sort((a, b) => `${a.table}.${a.name}`.localeCompare(`${b.table}.${b.name}`)),
  };
}

export function serializeDbContract(contract = generateDbContract()): string {
  return `${JSON.stringify(contract, null, 2)}\n`;
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function main() {
  const output = resolve(argumentValue("--out") ?? "docker/db-required-shape.json");
  const serialized = serializeDbContract();
  if (process.argv.includes("--check")) {
    if (!existsSync(output) || readFileSync(output, "utf8") !== serialized) {
      throw new Error(
        `${output} is stale; run npm run db:contract:generate and commit the result`,
      );
    }
    console.log(`[db-contract] current tables=${generateDbContract().tables.length}`);
    return;
  }
  writeFileSync(output, serialized, "utf8");
  console.log(`[db-contract] wrote ${output}`);
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
