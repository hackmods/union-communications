import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { hostedCustomerProfileEnabled } from "@/lib/auth/mfa-requirements";
import { noteMfaDurableFallback } from "@/lib/auth/mfa-durable-fallback-signal";
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

export async function issueMfaGrant(
  userId: string,
  now = Date.now(),
  sessionVersion = 0,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  assertGrantStoreAvailable(env);
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = new Date(now);
  const expiresAt = new Date(now + GRANT_TTL_MS);

  if (postgresGrantStoreEnabled(env)) {
    try {
      await withRlsContext({ userId }, async () => {
        await getDb()
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
          });
      });
      return nonce;
    } catch (error) {
      console.error("[auth] MFA grant Postgres write failed; using memory fallback", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      noteMfaDurableFallback("session_grant");
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
      // Miss on durable store: also accept an in-process grant from a prior
      // non-hosted Postgres fallback so verify→session.update still completes.
    } catch (error) {
      console.error("[auth] MFA grant Postgres consume failed; trying memory fallback", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      noteMfaDurableFallback("session_grant");
    }
  }

  const grant = memoryGrants.get(userId);
  if (!grant || grant.nonce !== nonce) return false;
  memoryGrants.delete(userId);
  return grant.sessionVersion === sessionVersion && now <= grant.expiresAt;
}
