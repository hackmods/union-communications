import { signedInHomeHref } from "@/lib/portal/access";
import type { HubModule, UserRole } from "@/types/tenant";

/** Relative Hub/Portal paths login may honor from `?next=`. */
export const POST_LOGIN_PATHS = [
  "/app",
  "/app/onboarding",
  "/app/invites",
  "/portal",
] as const;

export type PostLoginPath = (typeof POST_LOGIN_PATHS)[number];

/**
 * Allowlist only. Rejects protocol-relative URLs, query/hash, and unknown paths
 * so an invite email cannot bounce the browser off-site.
 */
export function safePostLoginPath(
  raw: string | null | undefined,
): PostLoginPath | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://") || trimmed.includes("\\")) return null;
  const path = trimmed.split("?")[0]?.split("#")[0] ?? "";
  return (POST_LOGIN_PATHS as readonly string[]).includes(path)
    ? (path as PostLoginPath)
    : null;
}

/** After accept: presidents set up the local; members open Portal. */
export function nextPathForInviteRoles(
  roles: readonly string[],
): PostLoginPath | null {
  if (roles.includes("local_president")) return "/app/onboarding";
  if (roles.length > 0 && roles.every((role) => role === "local_member")) {
    return "/portal";
  }
  return null;
}

export function loginHrefForInviteRoles(roles: readonly string[]): string {
  const next = nextPathForInviteRoles(roles);
  return next ? `/app/login?next=${encodeURIComponent(next)}` : "/app/login";
}

export function resolvePostLoginHref(input: {
  roles: UserRole[];
  enabledModules?: readonly HubModule[];
  next?: string | null;
}): PostLoginPath {
  const safe = safePostLoginPath(input.next);
  if (safe) return safe;
  return signedInHomeHref(input.roles, input.enabledModules);
}
