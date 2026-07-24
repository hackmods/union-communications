import { createHash } from "node:crypto";

/**
 * Hash a client IP for rate-limiting only — never store the raw IP (ADR-015).
 */
export function hashClientIp(
  ip: string,
  salt: string = process.env.AUTH_SECRET ?? "unionops-poll-salt",
): string {
  return createHash("sha256")
    .update(`${salt}:poll:${ip.trim()}`)
    .digest("hex");
}

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** In-memory sliding window: max N submits per IP hash per window. */
const buckets = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

export function checkPollSubmitRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const prev = buckets.get(ipHash) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    buckets.set(ipHash, recent);
    return false;
  }
  recent.push(now);
  buckets.set(ipHash, recent);
  return true;
}

/** @internal test helper */
export function resetPollSubmitRateLimit(): void {
  buckets.clear();
}
