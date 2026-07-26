#!/usr/bin/env node
/**
 * Preflight GET /api/health for deploy verification and sandbox smoke.
 * Exits 0 when status is ok; prints commit + version on success.
 */
const base = (
  process.env.HEALTH_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const url = `${base}/api/health`;

let res;
try {
  res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
} catch (err) {
  console.error(`[health-check] Failed to reach ${url}:`, err);
  process.exit(1);
}

if (!res.ok) {
  console.error(`[health-check] ${url} returned HTTP ${res.status}`);
  process.exit(1);
}

let body;
try {
  body = await res.json();
} catch {
  console.error("[health-check] Response was not JSON");
  process.exit(1);
}

if (body.status !== "ok") {
  console.error("[health-check] Unexpected payload:", body);
  process.exit(1);
}

console.log(
  `[health-check] ok commit=${body.commit ?? "unknown"} version=${body.version ?? "unknown"} email=${body.emailEnabled} cron=${body.cronConfigured}`,
);
process.exit(0);
