#!/usr/bin/env node
/**
 * Preflight GET /api/health for deploy verification and sandbox smoke.
 * Exits 0 when status is ok; prints commit + version on success.
 *
 * Set HEALTH_REQUIRE_DURABLE=true to fail when any confidential module (or auth
 * users) still uses memory — use after the Postgres flip on production hosts.
 *
 * Prefer AbortController + clearTimeout over AbortSignal.timeout — on
 * Windows, timeout() + process.exit(0) can assert UV_HANDLE_CLOSING.
 */
const base = (
  process.env.HEALTH_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const url = `${base}/api/health`;
const requireDurable = process.env.HEALTH_REQUIRE_DURABLE === "true";

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15_000);

/** @type {Response | undefined} */
let res;
try {
  res = await fetch(url, { signal: controller.signal });
} catch (err) {
  console.error(`[health-check] Failed to reach ${url}:`, err);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}

if (!process.exitCode) {
  if (!res?.ok) {
    console.error(`[health-check] ${url} returned HTTP ${res?.status}`);
    process.exitCode = 1;
  } else {
    let body;
    try {
      body = await res.json();
    } catch {
      console.error("[health-check] Response was not JSON");
      process.exitCode = 1;
      body = null;
    }

    if (body) {
      if (body.status !== "ok") {
        console.error("[health-check] Unexpected payload:", body);
        process.exitCode = 1;
      } else if (typeof body.version !== "string" || body.version.length === 0) {
        console.error("[health-check] Missing version field");
        process.exitCode = 1;
      } else {
        const memoryBackends = Object.entries(body.backends ?? {}).filter(
          ([, value]) => value === "memory",
        );
        console.log(
          `[health-check] ok commit=${body.commit ?? "unknown"} version=${body.version ?? "unknown"} email=${body.emailEnabled} cron=${body.cronConfigured} postgres=${body.postgresConfigured} durable=${body.postgresFlipComplete} demoAuth=${body.demoAuthEnabled}`,
        );
        if (memoryBackends.length > 0) {
          console.log(
            `[health-check] memory backends (${memoryBackends.length}): ${memoryBackends.map(([k]) => k).join(", ")}`,
          );
        }
        if (requireDurable && body.postgresFlipComplete !== true) {
          console.error(
            "[health-check] HEALTH_REQUIRE_DURABLE=true but postgresFlipComplete is false",
          );
          process.exitCode = 1;
        }
      }
    }
  }
}
