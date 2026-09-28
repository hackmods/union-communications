/**
 * Enrollment-in-progress + demo-roster TOTP secret overrides.
 * In-memory and process-scoped by design (SEC-003 pattern) until a users
 * table / Postgres-backed session store lands — see `mfa-user-secret.ts` for
 * the postgres path when `AUTH_USERS_BACKEND=postgres`.
 */

const PENDING_TTL_MS = 10 * 60_000;

interface PendingEnrollment {
  secret: string;
  expiresAt: number;
}

const pending = new Map<string, PendingEnrollment>();
/** Confirmed secrets for demo users — kept separate from the DEMO_USERS const. */
const confirmedOverrides = new Map<string, string>();
/** Users whose demo/static secret was admin-cleared in this process. */
const clearedOverrides = new Set<string>();

export function setPendingSecret(
  userId: string,
  secret: string,
  now = Date.now(),
): void {
  pending.set(userId, { secret, expiresAt: now + PENDING_TTL_MS });
}

export function getPendingSecret(
  userId: string,
  now = Date.now(),
): string | null {
  const entry = pending.get(userId);
  if (!entry || now > entry.expiresAt) {
    if (entry) pending.delete(userId);
    return null;
  }
  return entry.secret;
}

export function clearPendingSecret(userId: string): void {
  pending.delete(userId);
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
  confirmedOverrides.clear();
  clearedOverrides.clear();
}
