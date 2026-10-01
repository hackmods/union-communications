import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { withRlsContext } from "@/lib/db/rls-context";

const processQueues = new Map<string, Promise<void>>();

async function serializeInProcess<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const previous = processQueues.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  processQueues.set(userId, current);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (processQueues.get(userId) === current) processQueues.delete(userId);
  }
}

/** Serialize factor use and grant issuance per account, across processes in Postgres mode. */
export function withMfaAccountLock<T>(
  userId: string,
  work: () => Promise<T>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  return serializeInProcess(userId, async () => {
    const postgres =
      env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
      isPostgresConfigured(env);
    if (!postgres) return work();

    return withRlsContext({ userId }, async () => {
      const [account] = await getDb()
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for("update")
        .limit(1);
      if (!account) throw new Error("MFA account is unavailable.");
      return work();
    });
  });
}
