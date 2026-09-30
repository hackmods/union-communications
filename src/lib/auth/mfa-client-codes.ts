/**
 * Stable MFA outcome codes for Hub UI. Officers see EN/FR mapped from `code`;
 * APIs may still include a short English `error` for tests and ops logs.
 */

export const MFA_CLIENT_CODES = [
  "empty",
  "invalid",
  "replayed",
  "storage_unavailable",
  "session_not_verified",
  "not_enrolled",
  "limited",
  "no_pending",
] as const;

export type MfaClientCode = (typeof MFA_CLIENT_CODES)[number];

const CODE_SET = new Set<string>(MFA_CLIENT_CODES);

export function isMfaClientCode(value: unknown): value is MfaClientCode {
  return typeof value === "string" && CODE_SET.has(value);
}

/** RFC 6238 6-digit TOTP (or shared-code MFA). */
export function looksLikeTotpCode(raw: string): boolean {
  return /^\d{6}$/.test(raw.trim());
}

/**
 * Recovery codes are 16 alphabet characters, usually shown as 4-4-4-4.
 * Do not treat empty or 6-digit TOTP as recovery (that reserved throttle slots).
 */
export function looksLikeRecoveryCode(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || looksLikeTotpCode(trimmed)) return false;
  const normalized = trimmed.toUpperCase().replace(/[\s-]/g, "");
  return normalized.length === 16 && /^[A-Z0-9]+$/.test(normalized);
}

export type SubmittedMfaKind = "empty" | "totp" | "recovery" | "invalid";

export function classifySubmittedMfaCode(raw: string): SubmittedMfaKind {
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  if (looksLikeTotpCode(trimmed)) return "totp";
  if (looksLikeRecoveryCode(trimmed)) return "recovery";
  return "invalid";
}

export function officerMfaErrorMessage(
  code: unknown,
  translate: (key: MfaClientCode) => string,
  fallback: string,
): string {
  if (isMfaClientCode(code)) return translate(code);
  return fallback;
}
