/**
 * Durability smoke (SEC-003).
 *
 * Creates a grievance via DrizzleGrievanceAdapter, resets the DB client
 * (simulates process restart), and asserts the row still exists.
 *
 * Requires:
 *   DATABASE_URL=…
 *   GRIEVANCE_DB_BACKEND=postgres
 *
 * Seed the reference tenant first (`npm run db:seed`) so FKs resolve.
 *
 * Run: npm run db:durability-smoke
 */
import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured, resetDbClient } from "../src/lib/db/client";
import { grievanceEvents, grievances } from "../src/lib/db/schema";
import { seedReferenceTenant } from "../src/lib/db/seed";
import { DrizzleGrievanceAdapter } from "../src/lib/grievance/drizzle-adapter";

async function main(): Promise<void> {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is required");
  }
  if (process.env.GRIEVANCE_DB_BACKEND?.trim().toLowerCase() !== "postgres") {
    throw new Error("GRIEVANCE_DB_BACKEND=postgres is required");
  }

  await seedReferenceTenant();

  const adapter = new DrizzleGrievanceAdapter();
  const created = await adapter.create(
    {
      memberPseudonym: "Durability Smoke",
      category: "durability-smoke",
      filedAt: new Date().toISOString(),
      bargainingUnitId: "bu-243-ft",
    },
    {
      unionId: "union-opseu",
      localId: "local-243",
      bargainingUnitId: "bu-243-ft",
      createdById: "user-durability-smoke",
      assignedStewardId: "user-durability-smoke",
    },
  );

  const id = created.grievance.id;
  console.log(`[durability-smoke] created ${id}; resetting client…`);

  resetDbClient();

  const adapter2 = new DrizzleGrievanceAdapter();
  const found = await adapter2.getById(id);
  if (!found) {
    throw new Error(`Grievance ${id} missing after client reset`);
  }
  if (found.grievance.category !== "durability-smoke") {
    throw new Error(
      `Unexpected category after reconnect: ${found.grievance.category}`,
    );
  }

  // Cleanup via fresh connection
  const db = getDb();
  await db.delete(grievanceEvents).where(eq(grievanceEvents.grievanceId, id));
  await db.delete(grievances).where(eq(grievances.id, id));
  resetDbClient();

  console.log(
    "[durability-smoke] ok — grievance survived client reconnect (Postgres durable)",
  );
}

main().catch((err) => {
  console.error("[durability-smoke] failed:", err);
  process.exitCode = 1;
});
