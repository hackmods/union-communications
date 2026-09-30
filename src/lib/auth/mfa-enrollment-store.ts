/**
 * Enrollment-in-progress TOTP secrets + demo-roster confirmed-secret overrides.
 *
 * Pending QR secrets persist in Postgres when AUTH_USERS_BACKEND=postgres so
 * enroll → confirm survives replica hops. Demo confirmed overrides stay
 * process-local (they are not the QR path).
 */

import { eq } from "drizzle-orm";
import { hostedCustomerProfileEnabled } from "@/lib/auth/mfa-requirements";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "@/lib/auth/totp-secret-crypto";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { mfaPendingEnrollments } from "@/lib/db/schema/auth";
import { withRlsContext } from "@/lib/db/rls-context";

export const PENDING_TTL_MS = 10 * 60_000;
/** Placeholder used instead of DELETE (`unionops_app` has no DELETE on this table). */
export const CLEARED_PENDING_SECRET = "CLEARED-PENDING-ENROLLMENT";

interface PendingEnrollment {
  secret: string;
  expiresAt: number;
}

const pending = new Map<string, PendingEnrollment>();
/** Test-only shared map so replica-split coverage works without live Postgres. */
let sharedPendingForTests: Map<string, PendingEnrollment> | null = null;
/** Confirmed secrets for demo users — kept separate from the DEMO_USERS const. */
const confirmedOverrides = new Map<string, string>();
/** Users whose demo/static secret was admin-cleared in this process. */
const clearedOverrides = new Set<string>();

function postgresPendingStoreEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

function assertPendingStoreAvailable(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (hostedCustomerProfileEnabled(env) && !postgresPendingStoreEnabled(env)) {
    throw new Error(
      "Hosted customer MFA enrollment requires durable PostgreSQL storage.",
    );
  }
}

function liveSecret(
  entry: PendingEnrollment | undefined,
  now: number,
): string | null {
  if (!entry || now > entry.expiresAt || !entry.secret) return null;
  return entry.secret;
}

/** @internal test helper: treat a second in-memory map as the durable store. */
export function useSharedPendingEnrollmentStoreForTests(): void {
  sharedPendingForTests = new Map();
}

/** @internal test helper: drop only this process's pending cache. */
export function resetMfaPendingProcessMemoryForTests(): void {
  pending.clear();
}

export async function setPendingSecret(
  userId: string,
  secret: string,
  now = Date.now(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  assertPendingStoreAvailable(env);
  const entry: PendingEnrollment = { secret, expiresAt: now + PENDING_TTL_MS };
  pending.set(userId, entry);
  sharedPendingForTests?.set(userId, { ...entry });

  if (postgresPendingStoreEnabled(env)) {
    let stored: string;
    try {
      stored = encryptTotpSecret(secret, userId, env);
    } catch (error) {
      console.error("[auth] MFA pending enrollment encrypt failed", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    try {
      await withRlsContext({ userId }, async () => {
        await getDb()
          .insert(mfaPendingEnrollments)
          .values({
            userId,
            secret: stored,
            expiresAt: new Date(entry.expiresAt),
          })
          .onConflictDoUpdate({
            target: mfaPendingEnrollments.userId,
            set: {
              secret: stored,
              expiresAt: new Date(entry.expiresAt),
            },
          });
      });
    } catch (error) {
      console.error("[auth] MFA pending enrollment Postgres write failed", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export async function getPendingSecret(
  userId: string,
  now = Date.now(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  assertPendingStoreAvailable(env);

  if (postgresPendingStoreEnabled(env)) {
    const [row] = await withRlsContext({ userId }, async () =>
      getDb()
        .select({
          secret: mfaPendingEnrollments.secret,
          expiresAt: mfaPendingEnrollments.expiresAt,
        })
        .from(mfaPendingEnrollments)
        .where(eq(mfaPendingEnrollments.userId, userId))
        .limit(1),
    );
    if (
      !row ||
      !row.secret ||
      row.secret === CLEARED_PENDING_SECRET ||
      now > row.expiresAt.getTime()
    ) {
      if (row?.secret && row.secret !== CLEARED_PENDING_SECRET) {
        await clearPendingSecret(userId, env);
      }
      return null;
    }
    return decryptTotpSecret(row.secret, userId, env);
  }

  const local = liveSecret(pending.get(userId), now);
  if (local) return local;
  if (pending.has(userId)) pending.delete(userId);

  const shared = liveSecret(sharedPendingForTests?.get(userId), now);
  if (shared) return shared;
  sharedPendingForTests?.delete(userId);
  return null;
}

export async function clearPendingSecret(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  pending.delete(userId);
  sharedPendingForTests?.delete(userId);

  if (postgresPendingStoreEnabled(env)) {
    await withRlsContext({ userId }, async () => {
      await getDb()
        .update(mfaPendingEnrollments)
        .set({
          secret: CLEARED_PENDING_SECRET,
          expiresAt: new Date(0),
        })
        .where(eq(mfaPendingEnrollments.userId, userId));
    });
  }
}

export function setConfirmedSecretOverride(userId: string, secret: string): void {
  clearedOverrides.delete(userId);
  confirmedOverrides.set(userId, secret);
}

export function getConfirmedSecretOverride(userId: string): string | null {
  if (clearedOverrides.has(userId)) return null;
  return confirmedOverrides.get(userId) ?? null;
}

/** True when an admin clear blocked falling back to a demo roster secret. */
export function isConfirmedSecretCleared(userId: string): boolean {
  return clearedOverrides.has(userId);
}

/** Clears memory override and blocks demo-roster secret fallback for this process. */
export function clearConfirmedSecretOverride(userId: string): void {
  confirmedOverrides.delete(userId);
  clearedOverrides.add(userId);
}

/** @internal test helper */
export function resetMfaEnrollmentStoreForTests(): void {
  pending.clear();
  sharedPendingForTests = null;
  confirmedOverrides.clear();
  clearedOverrides.clear();
}
