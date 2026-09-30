/**
 * CapRover / host recovery allowlist: named operator emails may skip Hub MFA
 * challenge and fresh step-up while host MFA stays on for everyone else.
 *
 * AUTH_MFA_OPERATOR_BYPASS_EMAILS=comma-separated emails (case-insensitive).
 * Clear the env after recovery. Never log the allowlist contents.
 */

export function parseMfaOperatorBypassEmails(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Set<string> {
  const raw = env.AUTH_MFA_OPERATOR_BYPASS_EMAILS?.trim();
  if (!raw) return new Set();
  const emails = new Set<string>();
  for (const part of raw.split(/[,;]/)) {
    const normalized = part.trim().toLowerCase();
    if (normalized.includes("@")) emails.add(normalized);
  }
  return emails;
}

export function isMfaOperatorBypassConfigured(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return parseMfaOperatorBypassEmails(env).size > 0;
}

export function isMfaOperatorBypassEmail(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return parseMfaOperatorBypassEmails(env).has(normalized);
}
