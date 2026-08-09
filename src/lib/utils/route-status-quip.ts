/** Path buckets for Local 404 / error rotating quips. */
export type RouteStatusBucket =
  | "notFound"
  | "error"
  | "hub"
  | "portal"
  | "poll"
  | "rsvp"
  | "meeting";

export type RouteStatusVariant = "notFound" | "error";

/** djb2-ish stable hash — same input always maps to the same index. */
export function hashPathname(pathname: string): number {
  let h = 5381;
  for (let i = 0; i < pathname.length; i++) {
    h = (h * 33) ^ pathname.charCodeAt(i);
  }
  return Math.abs(h);
}

/** Strip leading `/en` or `/fr` so buckets match route trees. */
export function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|fr)(?=\/|$)/, "");
  return stripped.length > 0 ? stripped : "/";
}

/**
 * Prefer domain-specific buckets when the path matches; otherwise
 * `notFound` / `error` for public and hub error surfaces.
 */
export function resolveRouteStatusBucket(
  pathname: string,
  variant: RouteStatusVariant,
): RouteStatusBucket {
  const path = stripLocalePrefix(pathname);

  if (path.startsWith("/poll/") || path === "/poll") return "poll";
  if (path.startsWith("/r/") || path === "/r") return "rsvp";
  if (path.startsWith("/meetings/") || path === "/meetings") return "meeting";
  if (path.startsWith("/portal")) return "portal";
  if (path.startsWith("/app")) {
    return variant === "error" ? "error" : "hub";
  }
  return variant === "error" ? "error" : "notFound";
}

export function pickRouteStatusQuip(
  quips: readonly string[],
  pathname: string,
): string {
  if (quips.length === 0) return "";
  return quips[hashPathname(pathname) % quips.length] ?? quips[0] ?? "";
}

/**
 * Pick from a bucket map with fallback to the variant's default pool.
 */
export function pickBucketQuip(
  banks: Partial<Record<RouteStatusBucket, readonly string[]>>,
  pathname: string,
  variant: RouteStatusVariant,
): string {
  const bucket = resolveRouteStatusBucket(pathname, variant);
  const preferred = banks[bucket];
  if (preferred && preferred.length > 0) {
    return pickRouteStatusQuip(preferred, pathname);
  }
  const fallbackKey: RouteStatusBucket =
    variant === "error" ? "error" : "notFound";
  const fallback = banks[fallbackKey] ?? [];
  return pickRouteStatusQuip(fallback, pathname);
}
