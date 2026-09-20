/**
 * Demo purge CLI — prints the same is_demo counts as
 * `/app/site-admin/demo-cleanup`, then deletes only after the operator
 * types exactly `DELETE demo`.
 *
 * Requires:
 *   DATABASE_URL          — count / preview (runtime role is fine)
 *   MIGRATE_DATABASE_URL  — destructive delete (owner role; bypasses RLS)
 *
 * Usage:
 *   npm run db:demo-purge              # interactive confirm
 *   npm run db:demo-purge -- --dry-run # counts only
 *
 * Pipe confirm non-interactively (ops automation):
 *   printf 'DELETE demo\n' | npm run db:demo-purge
 */
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getDb, isPostgresConfigured, resetDbClient } from "../src/lib/db/client";
import {
  closeOwnerDb,
  getOwnerDb,
  isOwnerDbConfigured,
} from "../src/lib/db/owner-client";
import {
  DEMO_PURGE_CONFIRM_PHRASE,
  assertDemoPurgeConfirm,
  countDemoRows,
  formatDemoPurgeCounts,
  purgeDemoRows,
  totalDemoCount,
} from "../src/lib/site-admin/demo-purge";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is required");
  }

  const previewDb = getDb();
  const counts = await countDemoRows(previewDb);
  console.log(`[demo-purge] preview ${formatDemoPurgeCounts(counts)}`);

  if (totalDemoCount(counts) === 0) {
    console.log("[demo-purge] nothing to delete");
    return;
  }

  if (dryRun) {
    console.log("[demo-purge] dry-run — no changes");
    return;
  }

  if (!isOwnerDbConfigured()) {
    throw new Error(
      "MIGRATE_DATABASE_URL is required to purge (owner role bypasses RLS)",
    );
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Type "${DEMO_PURGE_CONFIRM_PHRASE}" to permanently delete these rows: `,
    );
    assertDemoPurgeConfirm(answer.trim());
  } finally {
    rl.close();
  }

  const ownerDb = getOwnerDb();
  const result = await purgeDemoRows(ownerDb, {
    actorUserId: process.env.DEMO_PURGE_ACTOR_USER_ID?.trim() || undefined,
  });
  console.log(
    `[demo-purge] deleted ${formatDemoPurgeCounts(result.deleted)} caseworkStatements=${result.caseworkStatements}`,
  );
}

main()
  .catch((err) => {
    console.error("[demo-purge]", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    resetDbClient();
    await closeOwnerDb();
  });
