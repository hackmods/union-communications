import { and, eq } from "drizzle-orm";
import { authUsersDbBackend, checkinsDbBackend } from "@/lib/db/backend";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { checkinNudgeSends } from "@/lib/db/schema";

function dedupeKey(scheduleId: string, periodKey: string, userId: string): string {
  return `${scheduleId}::${periodKey}::${userId}`;
}

const memorySent = new Set<string>();

function newId(): string {
  return `checkin-nudge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function usePostgresNudgeStore(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    checkinsDbBackend(env) === "postgres" &&
    authUsersDbBackend(env) === "postgres" &&
    isPostgresConfigured()
  );
}

/** @internal */
export function resetCheckinNudgeSendsMemoryForTests(): void {
  memorySent.clear();
}

export async function hasCheckinNudgeBeenSent(
  scheduleId: string,
  periodKey: string,
  userId: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const key = dedupeKey(scheduleId, periodKey, userId);
  if (!usePostgresNudgeStore(env)) {
    return memorySent.has(key);
  }
  const [row] = await withRlsContext({ retentionJob: true }, () =>
    getDb()
      .select({ id: checkinNudgeSends.id })
      .from(checkinNudgeSends)
      .where(
        and(
          eq(checkinNudgeSends.scheduleId, scheduleId),
          eq(checkinNudgeSends.periodKey, periodKey),
          eq(checkinNudgeSends.userId, userId),
        ),
      )
      .limit(1),
  );
  return Boolean(row);
}

/**
 * Claim a send slot before dispatch. Returns false when already nudged for this period.
 */
export async function claimCheckinNudgeSend(input: {
  scheduleId: string;
  periodKey: string;
  userId: string;
  unionId: string;
  localId: string;
  destinationEmail: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<boolean> {
  const env = input.env ?? process.env;
  const key = dedupeKey(input.scheduleId, input.periodKey, input.userId);
  if (!usePostgresNudgeStore(env)) {
    if (memorySent.has(key)) return false;
    memorySent.add(key);
    return true;
  }

  const inserted = await withRlsContext({ retentionJob: true }, async () => {
    const rows = await getDb()
      .insert(checkinNudgeSends)
      .values({
        id: newId(),
        scheduleId: input.scheduleId,
        periodKey: input.periodKey,
        userId: input.userId,
        unionId: input.unionId,
        localId: input.localId,
        destinationEmail: input.destinationEmail.trim().toLowerCase(),
      })
      .onConflictDoNothing({
        target: [
          checkinNudgeSends.scheduleId,
          checkinNudgeSends.periodKey,
          checkinNudgeSends.userId,
        ],
      })
      .returning({ id: checkinNudgeSends.id });
    return rows.length > 0;
  });
  return inserted;
}
