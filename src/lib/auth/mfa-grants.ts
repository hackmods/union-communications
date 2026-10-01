import { createHash, randomBytes } from "node:crypto";
import { and, eq, gte, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { hostedCustomerProfileEnabled } from "@/lib/auth/mfa-requirements";
import { mfaErrorMetadata, noteMfaDurableFallback } from "@/lib/auth/mfa-durable-fallback-signal";
import { mustFailClosedOnMfaDurableStoreError } from "@/lib/auth/mfa-durable-store-policy";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { mfaSessionGrants } from "@/lib/db/schema/auth";
import { withRlsContext } from "@/lib/db/rls-context";

/**
 * Short-lived, single-use MFA grants.
 * Issued by POST /api/mfa/verify; consumed once in the JWT update callback.
 * Hosted customer grants persist only one SHA-256 token digest per account.
 */
export interface MfaGrant {
  userId: string;
  nonce: string;
  sessionVersion: number;
  issuedAt: number;
  expiresAt: number;
}

const GRANT_TTL_MS = 60_000;
const memoryGrants = new Map<string, MfaGrant>();

export class MfaGrantPendingError extends Error {
  constructor() {
    super("An MFA session grant is already waiting for this account.");
    this.name = "MfaGrantPendingError";
  }
}

function postgresGrantStoreEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

function assertGrantStoreAvailable(env: NodeJS.ProcessEnv = process.env): void {
  if (hostedCustomerProfileEnabled(env) && !postgresGrantStoreEnabled(env)) {
    throw new Error("Hosted customer MFA grants require durable PostgreSQL storage.");
  }
}

function digest(nonce: string): string {
  return createHash("sha256").update(nonce, "utf8").digest("hex");
}

/** @internal test helper; hosted state lives in PostgreSQL instead. */
export function clearMfaGrants(): void {
  memoryGrants.clear();
}

/** @internal test helper; hosted state lives in PostgreSQL instead. */
export function getMfaGrant(userId: string): MfaGrant | undefined {
  return memoryGrants.get(userId);
}

/** Refuse factor consumption when an earlier verified browser still owns a grant. */
export async function assertNoPendingMfaGrant(
  userId: string,
  now = Date.now(),
  sessionVersion = 0,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (postgresGrantStoreEnabled(env)) {
    const [grant] = await withRlsContext({ userId }, async () =>
      getDb().select({ userId: mfaSessionGrants.userId })
        .from(mfaSessionGrants)
        .where(and(
          eq(mfaSessionGrants.userId, userId),
          eq(mfaSessionGrants.sessionVersion, sessionVersion),
          isNull(mfaSessionGrants.consumedAt),
          gte(mfaSessionGrants.expiresAt, new Date(now)),
        ))
        .for("update")
        .limit(1),
    );
    if (grant) throw new MfaGrantPendingError();
    return;
  }
  const grant = memoryGrants.get(userId);
  if (grant && grant.sessionVersion === sessionVersion && grant.expiresAt > now) {
    throw new MfaGrantPendingError();
  }
}

export async function issueMfaGrant(
  userId: string,
  now = Date.now(),
  sessionVersion = 0,
  env: NodeJS.ProcessEnv = process.env,
  options: { rejectPending?: boolean } = {},
): Promise<string> {
  assertGrantStoreAvailable(env);
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = new Date(now);
  const expiresAt = new Date(now + GRANT_TTL_MS);

  if (postgresGrantStoreEnabled(env)) {
    try {
      await withRlsContext({ userId }, async () => {
        const [grant] = await getDb()
          .insert(mfaSessionGrants)
          .values({
            userId,
            tokenHash: digest(nonce),
            sessionVersion,
            issuedAt,
            expiresAt,
            consumedAt: null,
          })
          .onConflictDoUpdate({
            target: mfaSessionGrants.userId,
            set: {
              tokenHash: digest(nonce),
              sessionVersion,
              issuedAt,
              expiresAt,
              consumedAt: null,
            },
            ...(options.rejectPending
              ? {
                  setWhere: or(
                    isNotNull(mfaSessionGrants.consumedAt),
                    lte(mfaSessionGrants.expiresAt, issuedAt),
                    ne(mfaSessionGrants.sessionVersion, sessionVersion),
                  ),
                }
              : {}),
          })
          .returning({ userId: mfaSessionGrants.userId });
        if (options.rejectPending && !grant) throw new MfaGrantPendingError();
      });
      memoryGrants.delete(userId);
      return nonce;
    } catch (error) {
      if (error instanceof MfaGrantPendingError) throw error;
      console.error("[auth] MFA grant Postgres write failed", {
        userId,
        ...mfaErrorMetadata(error),
      });
      noteMfaDurableFallback("session_grant");
      if (mustFailClosedOnMfaDurableStoreError(env)) throw error;
    }
  }

  if (options.rejectPending) {
    const existing = memoryGrants.get(userId);
    if (
      existing &&
      existing.sessionVersion === sessionVersion &&
      existing.expiresAt > now
    ) {
      throw new MfaGrantPendingError();
    }
  }

  memoryGrants.set(userId, {
    userId,
    nonce,
    sessionVersion,
    issuedAt: now,
    expiresAt: now + GRANT_TTL_MS,
  });
  return nonce;
}

/** Consume the matching grant even when expired or stale, so it cannot be retried. */
export async function consumeMfaGrant(
  userId: string,
  nonce: string,
  now = Date.now(),
  sessionVersion = 0,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  assertGrantStoreAvailable(env);
  if (nonce.length > 128) return false;

  if (postgresGrantStoreEnabled(env)) {
    try {
      const [grant] = await withRlsContext({ userId }, async () =>
        getDb()
          .update(mfaSessionGrants)
          .set({ consumedAt: new Date(now) })
          .where(and(
            eq(mfaSessionGrants.userId, userId),
            eq(mfaSessionGrants.tokenHash, digest(nonce)),
            isNull(mfaSessionGrants.consumedAt),
          ))
          .returning({
            sessionVersion: mfaSessionGrants.sessionVersion,
            expiresAt: mfaSessionGrants.expiresAt,
          }),
      );
      if (
        grant &&
        grant.sessionVersion === sessionVersion &&
        now <= grant.expiresAt.getTime()
      ) {
        return true;
      }
      // A successful durable lookup with no matching grant is authoritative.
      // Never accept a stale in-process copy after a durable miss.
      return false;
    } catch (error) {
      console.error("[auth] MFA grant Postgres consume failed", {
        userId,
        ...mfaErrorMetadata(error),
      });
      noteMfaDurableFallback("session_grant");
      if (mustFailClosedOnMfaDurableStoreError(env)) throw error;
    }
  }

  const grant = memoryGrants.get(userId);
  if (!grant || grant.nonce !== nonce) return false;
  memoryGrants.delete(userId);
  return grant.sessionVersion === sessionVersion && now <= grant.expiresAt;
}
