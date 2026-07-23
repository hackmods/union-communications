/**
 * Short-lived, single-use MFA grants.
 * Issued by POST /api/mfa/verify; consumed once in the JWT update callback.
 * In-memory is intentional until Postgres sessions land (SEC-003).
 */

export interface MfaGrant {
  userId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

const GRANT_TTL_MS = 60_000;

const grants = new Map<string, MfaGrant>();

/** @internal test helper */
export function clearMfaGrants(): void {
  grants.clear();
}

/** @internal test helper */
export function getMfaGrant(userId: string): MfaGrant | undefined {
  return grants.get(userId);
}

export function issueMfaGrant(userId: string, now = Date.now()): string {
  const nonce = crypto.randomUUID();
  grants.set(userId, {
    userId,
    nonce,
    issuedAt: now,
    expiresAt: now + GRANT_TTL_MS,
  });
  return nonce;
}

export function consumeMfaGrant(
  userId: string,
  nonce: string,
  now = Date.now(),
): boolean {
  const grant = grants.get(userId);
  if (!grant || grant.nonce !== nonce || now > grant.expiresAt) {
    return false;
  }
  grants.delete(userId);
  return true;
}
