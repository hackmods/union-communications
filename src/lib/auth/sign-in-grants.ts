/**
 * Short-lived single-use grants after a magic sign-in link is consumed.
 * Consumed once in Credentials authorize() — mirrors MFA grants (SEC-001).
 */

export interface SignInGrant {
  userId: string;
  email: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

const GRANT_TTL_MS = 60_000;
const grants = new Map<string, SignInGrant>();

/** @internal test helper */
export function clearSignInGrants(): void {
  grants.clear();
}

export function issueSignInGrant(
  userId: string,
  email: string,
  now = Date.now(),
): string {
  const nonce = crypto.randomUUID();
  grants.set(nonce, {
    userId,
    email: email.trim().toLowerCase(),
    nonce,
    issuedAt: now,
    expiresAt: now + GRANT_TTL_MS,
  });
  return nonce;
}

export function consumeSignInGrant(
  nonce: string,
  now = Date.now(),
): SignInGrant | null {
  const grant = grants.get(nonce);
  if (!grant || now > grant.expiresAt) {
    grants.delete(nonce);
    return null;
  }
  grants.delete(nonce);
  return grant;
}
