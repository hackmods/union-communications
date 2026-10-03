import { createHash } from "node:crypto";

/**
 * Hash a client IP for access-request rate-limiting only — never store the raw IP
 * (ADR-015 / ADR-018).
 */
export function hashAccessRequestClientIp(
  ip: string,
  salt: string = process.env.AUTH_SECRET ?? "unionops-access-request-salt",
): string {
  return createHash("sha256")
    .update(`${salt}:access-request:${ip.trim()}`)
    .digest("hex");
}

/**
 * CapRover sets X-Real-IP; Cloudflare sets CF-Connecting-IP. Reading only the
 * first X-Forwarded-For hop collapsed every visitor onto `"unknown"` in
 * production and locked the public /join and /request-access forms.
 */
export function extractAccessRequestClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

const buckets = new Map<string, number[]>();

export const ACCESS_REQUEST_RATE_WINDOW_MS = 10 * 60_000;
export const ACCESS_REQUEST_MAX_PER_IP = 10;
/** Backstop when the proxy omitted every client-IP header. */
export const ACCESS_REQUEST_MAX_UNKNOWN = 40;
export const ACCESS_REQUEST_RETRY_AFTER_SECONDS = 600;

function bucketKey(ip: string): string {
  return ip === "unknown" ? "unknown" : hashAccessRequestClientIp(ip);
}

function maxFor(ip: string): number {
  return ip === "unknown"
    ? ACCESS_REQUEST_MAX_UNKNOWN
    : ACCESS_REQUEST_MAX_PER_IP;
}

/** In-memory sliding window: max N successful-looking submits per IP hash. */
export function checkAccessRequestRateLimit(ip: string): boolean {
  const key = bucketKey(ip);
  const max = maxFor(ip);
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter(
    (t) => now - t < ACCESS_REQUEST_RATE_WINDOW_MS,
  );
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

/** @internal test helper */
export function resetAccessRequestRateLimit(): void {
  buckets.clear();
}
