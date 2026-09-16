import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { platformMeta } from "@/lib/db/schema/platform";

/** Non-secret platform_meta view for /api/health and ops tooling. */
export type PlatformMetaView = {
  schemaVersion: number;
  dataVersion: number;
  appVersion: string;
  appliedMigrations: number;
  minAppVersion: string | null;
  migratedAt: Date | null;
};

/**
 * Read the single-row platform_meta core setup table.
 * Returns null when Postgres is not configured or the table is missing (pre-migrate).
 * Never throws — health surfaces must not crash the process.
 */
export async function readPlatformMeta(): Promise<PlatformMetaView | null> {
  if (!isPostgresConfigured()) return null;
  try {
    const rows = await getDb()
      .select()
      .from(platformMeta)
      .where(eq(platformMeta.id, 1))
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      schemaVersion: r.schemaVersion,
      dataVersion: r.dataVersion,
      appVersion: r.appVersion,
      appliedMigrations: r.appliedMigrations,
      minAppVersion: r.minAppVersion,
      migratedAt: r.migratedAt,
    };
  } catch (err) {
    // Table not created yet (baseline never ran) or DB unreachable — not fatal for health.
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[health] platform_meta read failed:",
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  }
}