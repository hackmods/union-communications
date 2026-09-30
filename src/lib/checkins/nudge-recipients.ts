import { and, eq, isNull, lte } from "drizzle-orm";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { authUsersDbBackend } from "@/lib/db/backend";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { localMemberships } from "@/lib/db/schema/organization-access";
import { users } from "@/lib/db/schema/tenant";
import { canAnswerCheckin } from "@/lib/checkins/access";
import type { CheckinSchedule } from "@/types/checkins";
import type { UserRole } from "@/types/tenant";

export type CheckinNudgeRecipient = {
  userId: string;
  email: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  roles: UserRole[];
};

function hubUsersFromDemoRoster(schedule: CheckinSchedule): CheckinNudgeRecipient[] {
  const out: CheckinNudgeRecipient[] = [];
  for (const user of DEMO_USERS) {
    if (user.unionId !== schedule.unionId) continue;
    const roles = user.roles as UserRole[];
    const localId = user.localId ?? schedule.localId;
    if (
      !canAnswerCheckin(schedule, user.id, user.unionId, localId, roles) &&
      !canAnswerCheckin(
        schedule,
        user.id,
        user.unionId,
        schedule.localId,
        roles,
      )
    ) {
      continue;
    }
    const email = user.email?.trim();
    if (!email) continue;
    out.push({
      userId: user.id,
      email,
      unionId: user.unionId,
      localId: schedule.localId,
      bargainingUnitId: user.bargainingUnitId,
      roles,
    });
  }
  return out;
}

export async function listCheckinNudgeRecipients(
  schedule: CheckinSchedule,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<CheckinNudgeRecipient[]> {
  const postgres =
    authUsersDbBackend(env) === "postgres" && Boolean(env.DATABASE_URL?.trim());

  if (!postgres) {
    return authUsersDbBackend(env) === "postgres"
      ? []
      : hubUsersFromDemoRoster(schedule);
  }

  if (!isPostgresConfigured()) return [];

  const now = new Date();
  const rows = await withRlsContext(
    {
      unionId: schedule.unionId,
      localId: schedule.localId,
      crossLocal: true,
    },
    () =>
      getDb()
        .select({
          id: users.id,
          email: users.email,
          localId: users.localId,
          bargainingUnitId: users.bargainingUnitId,
          roles: users.roles,
        })
        .from(localMemberships)
        .innerJoin(users, eq(users.id, localMemberships.userId))
        .where(
          and(
            eq(localMemberships.unionId, schedule.unionId),
            eq(localMemberships.localId, schedule.localId),
            eq(localMemberships.status, "active"),
            isNull(localMemberships.endedAt),
            lte(localMemberships.startedAt, now),
            eq(users.unionId, schedule.unionId),
            isNull(users.archivedAt),
            isNull(users.lockedAt),
          ),
        ),
  );

  const recipients: CheckinNudgeRecipient[] = [];
  for (const row of rows) {
    const email = row.email?.trim();
    if (!email) continue;
    const roles = (row.roles ?? []) as UserRole[];
    const memberLocalId = schedule.localId;
    if (
      !canAnswerCheckin(
        schedule,
        row.id,
        schedule.unionId,
        memberLocalId,
        roles,
      )
    ) {
      continue;
    }
    recipients.push({
      userId: row.id,
      email,
      unionId: schedule.unionId,
      localId: memberLocalId,
      bargainingUnitId: row.bargainingUnitId ?? undefined,
      roles,
    });
  }
  return recipients;
}
