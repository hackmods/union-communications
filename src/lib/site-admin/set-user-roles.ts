import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import type { UserRole } from "@/types/tenant";

export type SetUserRolesResult =
  | {
      ok: true;
      roles: UserRole[];
      sessionVersion: number;
    }
  | {
      ok: false;
      status: 400 | 404 | 409;
      error: string;
      code?: "sole_platform_admin";
    };

/**
 * Replace a user's Hub roles and bump sessionVersion so JWT role claims refresh.
 * Refuses to strip the last remaining platform_admin on the host.
 */
export async function setUserRoles(input: {
  actorUserId: string;
  targetUserId: string;
  roles: UserRole[];
}): Promise<SetUserRolesResult> {
  const next = [...new Set(input.roles)];
  if (next.length === 0) {
    return { ok: false, status: 400, error: "At least one role is required" };
  }

  const db = getDb();
  const [target] = await db
    .select({
      id: users.id,
      roles: users.roles,
      sessionVersion: users.sessionVersion,
      archivedAt: users.archivedAt,
    })
    .from(users)
    .where(eq(users.id, input.targetUserId))
    .limit(1);

  if (!target || target.archivedAt) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const hadPlatform = (target.roles ?? []).includes("platform_admin");
  const keepsPlatform = next.includes("platform_admin");
  if (hadPlatform && !keepsPlatform) {
    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(
        and(
          sql`${users.roles} @> '["platform_admin"]'::jsonb`,
          sql`${users.archivedAt} is null`,
        ),
      );
    if (Number(count) <= 1) {
      return {
        ok: false,
        status: 409,
        error: "Cannot remove the last site admin on this host",
        code: "sole_platform_admin",
      };
    }
  }

  const [updated] = await db
    .update(users)
    .set({
      roles: next,
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, input.targetUserId))
    .returning({
      roles: users.roles,
      sessionVersion: users.sessionVersion,
    });

  if (!updated) {
    return { ok: false, status: 404, error: "User not found" };
  }

  return {
    ok: true,
    roles: updated.roles as UserRole[],
    sessionVersion: updated.sessionVersion,
  };
}
