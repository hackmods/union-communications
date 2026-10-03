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

export function hashAccessRequestEmail(
  email: string,
  salt: string = process.env.AUTH_SECRET ?? "unionops-access-request-salt",
): string {
  return createHash("sha256")
    .update(`${salt}:access-request-email:${email.trim().toLowerCase()}`)
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

const ipBuckets = new Map<string, number[]>();
const emailBuckets = new Map<string, number[]>();

export const ACCESS_REQUEST_RATE_WINDOW_MS = 10 * 60_000;
/** Union-hall NAT / workshop Wi-Fi: a few hundred people in a few minutes. */
export const ACCESS_REQUEST_MAX_PER_IP = 500;
/** Backstop when the proxy omitted every client-IP header. */
export const ACCESS_REQUEST_MAX_UNKNOWN = 1500;
/** One person / one bot identity — not a hall of unique emails. */
export const ACCESS_REQUEST_MAX_PER_EMAIL = 8;
export const ACCESS_REQUEST_RETRY_AFTER_SECONDS = 600;

function ipBucketKey(ip: string): string {
  return ip === "unknown" ? "unknown" : hashAccessRequestClientIp(ip);
}

function maxForIp(ip: string): number {
  return ip === "unknown"
    ? ACCESS_REQUEST_MAX_UNKNOWN
    : ACCESS_REQUEST_MAX_PER_IP;
}

function allow(buckets: Map<string, number[]>, key: string, max: number): boolean {
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

/** In-memory sliding window: max N successful-looking submits per IP hash. */
export function checkAccessRequestRateLimit(ip: string): boolean {
  return allow(ipBuckets, ipBucketKey(ip), maxForIp(ip));
}

export function checkAccessRequestEmailRateLimit(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  return allow(
    emailBuckets,
    hashAccessRequestEmail(trimmed),
    ACCESS_REQUEST_MAX_PER_EMAIL,
  );
}

/** @internal test helper */
export function resetAccessRequestRateLimit(): void {
  ipBuckets.clear();
  emailBuckets.clear();
}
