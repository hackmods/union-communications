import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { MentionableUser } from "@/types/hub-social";

export interface MentionableScope {
  unionId: string;
  localId?: string;
  accessibleLocalIds?: string[];
}

function usersFromDemoRoster(scope: MentionableScope): MentionableUser[] {
  const localIds = new Set<string>();
  if (scope.localId) localIds.add(scope.localId);
  for (const id of scope.accessibleLocalIds ?? []) localIds.add(id);

  return DEMO_USERS.filter((user) => {
    if (user.unionId !== scope.unionId) return false;
    if (localIds.size === 0) return true;
    if (user.localId && localIds.has(user.localId)) return true;
    return (user.accessibleLocalIds ?? []).some((id) => localIds.has(id));
  }).map((user) => ({ id: user.id, name: user.name }));
}

/** Officers mentionable in the current union/local scope. */
export async function listMentionableHubUsers(
  scope: MentionableScope,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<MentionableUser[]> {
  const postgres =
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    Boolean(env.DATABASE_URL?.trim());

  if (postgres) {
    try {
      const db = getDb();
      const localIds = scope.localId
        ? [scope.localId, ...(scope.accessibleLocalIds ?? [])]
        : (scope.accessibleLocalIds ?? []);

      const conditions = [eq(users.unionId, scope.unionId)];
      if (localIds.length > 0) {
        conditions.push(
          or(
            inArray(users.localId, localIds),
            isNull(users.localId),
          )!,
        );
      }

      const rows = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(and(...conditions));

      if (rows.length > 0) {
        return rows.map((row) => ({ id: row.id, name: row.name }));
      }
    } catch {
      // Fall through to demo roster when Postgres is unavailable in dev.
    }
  }

  return usersFromDemoRoster(scope);
}
