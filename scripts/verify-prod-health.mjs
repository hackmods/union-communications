#!/usr/bin/env node
/**
 * Production hardening gate — COMPLIANCE_HARDENING_LIVE.md Phase 3A.
 *
 * Fails unless Officer Hub shows durable Postgres, demo auth off, MFA on.
 * Portal remains memory-only (no PORTAL_DB_BACKEND) — prints a reminder.
 *
 * Usage:
 *   HEALTH_URL=https://unionops.org node scripts/verify-prod-health.mjs
 *   npm run health:check:production
 */
const base = (
  process.env.HEALTH_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const url = `${base}/api/health`;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15_000);

/** @type {Response | undefined} */
let res;
try {
  res = await fetch(url, { signal: controller.signal });
} catch (err) {
  console.error(`[verify-prod-health] Failed to reach ${url}:`, err);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}

if (process.exitCode) {
  // avoid process.exit() — Windows UV_HANDLE_CLOSING on aborted fetch
} else if (!res?.ok) {
  console.error(`[verify-prod-health] ${url} returned HTTP ${res?.status}`);
  process.exitCode = 1;
} else {
  /** @type {Record<string, unknown>} */
  let body;
  try {
    body = await res.json();
  } catch {
    console.error("[verify-prod-health] Response was not JSON");
    process.exitCode = 1;
    body = null;
  }

  if (body) {
    /** @param {boolean} ok @param {string} label */
    function gate(ok, label) {
      const mark = ok ? "PASS" : "FAIL";
      console.log(`[verify-prod-health] ${mark} ${label}`);
      return ok;
    }

    let ok = true;

    ok = gate(body.status === "ok", "status=ok") && ok;
    ok = gate(body.postgresConfigured === true, "postgresConfigured=true") && ok;
    ok = gate(body.postgresFlipComplete === true, "postgresFlipComplete=true") && ok;
    ok = gate(body.memoryCaseDataActive === false, "memoryCaseDataActive=false") && ok;
    ok = gate(body.demoAuthEnabled === false, "demoAuthEnabled=false") && ok;
    ok = gate(body.mfaEnabled === true, "mfaEnabled=true") && ok;

    const backends = body.backends ?? {};
    const memoryKeys = Object.entries(backends).filter(([, v]) => v === "memory");
    ok =
      gate(
        memoryKeys.length === 0,
        `backends all postgres (${memoryKeys.length} still memory)`,
      ) && ok;

    if (memoryKeys.length > 0) {
      for (const [key] of memoryKeys) {
        console.log(`[verify-prod-health]   memory: ${key}`);
      }
    }

    console.log(
      `[verify-prod-health] commit=${body.commit ?? "unknown"} version=${body.version ?? "unknown"}`,
    );
    console.log(
      "[verify-prod-health] Portal: no PORTAL_DB_BACKEND — Circles stay evaluation-only (memory banner expected).",
    );

    if (!ok) {
      console.error(
        "[verify-prod-health] Production hardening gates not met — see docs/guides/COMPLIANCE_HARDENING_LIVE.md",
      );
      process.exitCode = 1;
    } else {
      console.log("[verify-prod-health] ok — Officer Hub production gates passed");
    }
  }
}
