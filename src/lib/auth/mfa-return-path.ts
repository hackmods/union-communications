/**
 * Safe Hub return paths after MFA challenge / setup.
 * Broader than post-login allowlist so deep links (e.g. /app/grievances/[id])
 * can resume, but still rejects open redirects.
 */

const MFA_LOOP_PREFIXES = ["/app/mfa", "/app/login"] as const;
const ALLOWED_ROOTS = ["/app", "/tools", "/documents", "/portal"] as const;
const MAX_NEXT_LENGTH = 512;

function isAllowedHubPath(path: string): boolean {
  return ALLOWED_ROOTS.some(
    (root) => path === root || path.startsWith(`${root}/`),
  );
}

/** Reject protocol-relative, absolute, and non-Hub paths. */
export function safeMfaReturnPath(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://") || trimmed.includes("\\")) return null;
  if (trimmed.length > MAX_NEXT_LENGTH) return null;
  const path = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (!isAllowedHubPath(path)) return null;
  // Path segments: letters, digits, hyphen, underscore, percent-encoding — no ".."
  if (path.includes("..")) return null;
  if (!/^\/(?:app|tools|documents|portal)(?:\/[A-Za-z0-9._~\-%]+)*$/.test(path)) {
    return null;
  }
  for (const loop of MFA_LOOP_PREFIXES) {
    if (path === loop || path.startsWith(`${loop}/`)) return null;
  }
  return path;
}

function withNextQuery(base: string, next?: string | null): string {
  const safe = safeMfaReturnPath(next);
  if (!safe) return base;
  return `${base}?next=${encodeURIComponent(safe)}`;
}

/** `/app/mfa` or `/app/mfa?next=…` (locale-free; prepend locale in server redirects). */
export function hubMfaChallengeHref(next?: string | null): string {
  return withNextQuery("/app/mfa", next);
}

export type MfaSetupMode = "enroll" | "replace";

/** `/app/mfa/setup` with optional next + replace mode. */
export function hubMfaSetupHref(
  next?: string | null,
  mode?: MfaSetupMode | null,
): string {
  const params = new URLSearchParams();
  const safe = safeMfaReturnPath(next);
  if (safe) params.set("next", safe);
  if (mode === "replace") params.set("mode", "replace");
  const qs = params.toString();
  return qs ? `/app/mfa/setup?${qs}` : "/app/mfa/setup";
}

/**
 * Locale-aware server redirect target for MFA challenge.
 * `hubPath` should be the Hub path without locale (e.g. `/app/grievances`).
 */
export function localeMfaRedirect(locale: string, hubPath?: string | null): string {
  return `/${locale}${hubMfaChallengeHref(hubPath)}`;
}
