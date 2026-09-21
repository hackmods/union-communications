/**
 * Upsert DEMO_USERS into Postgres so durable hosts match the login Callout
 * (president.7@unionops.test / demo123, etc.). Skip with SEED_DEMO_USERS=false.
 */
import { DEMO_SHARED_PASSWORD } from "@/lib/auth/demo-login-accounts";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { upsertPostgresUser } from "@/lib/auth/invite-postgres";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { localMemberships, officerAssignments } from "@/lib/db/schema";
import type { UserRole } from "@/types/tenant";

/** Plaintext shared by the demo roster — same as the login Callout. */
export const DEMO_ROSTER_PASSWORD = DEMO_SHARED_PASSWORD;

export function shouldSeedDemoUsers(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const flag = env.SEED_DEMO_USERS?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export async function seedDemoUsersToPostgres(): Promise<{
  upserted: number;
}> {
  const db = getDb();
  let upserted = 0;
  for (const user of DEMO_USERS) {
    const { id } = await upsertPostgresUser({
      userId: user.id,
      email: user.email,
      name: user.name,
      password: DEMO_ROSTER_PASSWORD,
      unionId: user.unionId,
      divisionId: user.divisionId,
      localId: user.localId,
      bargainingUnitId: user.bargainingUnitId,
      accessibleLocalIds: user.accessibleLocalIds,
      roles: user.roles as UserRole[],
      totpSecret: user.totpSecret ?? null,
      mfaEnabled: Boolean(user.totpSecret),
      isDemo: true,
    });
    if (user.unionId && user.localId) {
      const administrative = user.roles.some((role) =>
        ["platform_admin", "union_admin", "division_admin"].includes(role),
      );
      const scopedLocals = [...new Set([
        user.localId,
        ...(!administrative ? user.accessibleLocalIds ?? [] : []),
      ])];
      const now = new Date();
      for (const localId of scopedLocals) {
        const isPrimary = localId === user.localId;
        await db.insert(localMemberships).values({
          id: `lm-seed-${id}-${localId}`,
          unionId: user.unionId,
          localId,
          userId: id,
          bargainingUnitId: isPrimary ? user.bargainingUnitId ?? null : null,
          status: "active",
          isPrimary,
          startedAt: now,
          createdById: id,
        }).onConflictDoUpdate({
          target: [localMemberships.userId, localMemberships.localId],
          set: {
            unionId: user.unionId,
            bargainingUnitId: isPrimary ? user.bargainingUnitId ?? null : null,
            status: "active",
            endedAt: null,
            isPrimary,
          },
        });
      }

      const legacyOffices: Array<[UserRole, "president" | "steward" | "executive_member"]> = [
        ["local_president", "president"],
        ["local_steward", "steward"],
        ["local_exec", "executive_member"],
      ];
      for (const [legacyRole, position] of legacyOffices) {
        if (!user.roles.includes(legacyRole)) continue;
        const [existing] = await db.select({ id: officerAssignments.id }).from(officerAssignments).where(and(
          eq(officerAssignments.unionId, user.unionId), eq(officerAssignments.localId, user.localId),
          eq(officerAssignments.userId, id), eq(officerAssignments.position, position),
          isNull(officerAssignments.revokedAt), lte(officerAssignments.startsAt, now),
          or(isNull(officerAssignments.endsAt), gt(officerAssignments.endsAt, now)),
        )).limit(1);
        if (!existing) await db.insert(officerAssignments).values({
          id: `oa-seed-${id}-${position}`, unionId: user.unionId, localId: user.localId,
          userId: id, position, assignedById: id, startsAt: now,
        }).onConflictDoNothing();
      }

      // Materialize the Hall relationship through the same DB function used by
      // membership activation; this is safe to rerun and ignores admin-wide
      // context-switch locals for membership backfill.
      for (const localId of scopedLocals) {
        await withRlsContext({ unionId: user.unionId, localId, userId: id }, () =>
          getDb().execute(sql`SELECT app_sync_local_portal_membership(${user.unionId}, ${localId}, ${id})`),
        );
      }
    }
    upserted += 1;
  }
  return { upserted };
}
