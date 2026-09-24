#!/usr/bin/env node
/**
 * Post-deploy host readiness gate (mirrors src/lib/ops/host-readiness.ts).
 *
 * - Accepts intentional DATA_DB_BACKEND=memory
 * - MFA / email / cron are advisory — never fail the gate when MFA is off
 * - Fails on missing postgres backends (except intentional memory), unverified
 *   migrate, memory case-data still active, or demo auth still on
 *
 * Usage:
 *   HEALTH_URL=https://unionops.org/api/health node scripts/verify-host-readiness.mjs
 *   npm run health:check:readiness
 */
const base = (
  process.env.HEALTH_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const url = `${base.endsWith("/api/health") ? base : `${base}/api/health`}`;

/** Backends that may stay memory without failing the gate. */
const INTENTIONAL_MEMORY = new Set(["DATA_DB_BACKEND"]);

/** Presence ids that never fail CI (opt-in hardening only). */
const ADVISORY_PRESENCE = new Set([
  "emailEnabled",
  "cronConfigured",
  "mfaEnabled",
]);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15_000);

/** @type {Response | undefined} */
let res;
try {
  res = await fetch(url, { signal: controller.signal });
} catch (err) {
  console.error(`[verify-host-readiness] Failed to reach ${url}:`, err);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}

if (process.exitCode) {
  // keep exitCode
} else if (!res?.ok) {
  console.error(`[verify-host-readiness] ${url} returned HTTP ${res?.status}`);
  process.exitCode = 1;
} else {
  /** @type {Record<string, unknown> | null} */
  let body;
  try {
    body = await res.json();
  } catch {
    console.error("[verify-host-readiness] Response was not JSON");
    process.exitCode = 1;
    body = null;
  }

  if (body) {
    /** @param {boolean} ok @param {string} label */
    function gate(ok, label) {
      const mark = ok ? "PASS" : "FAIL";
      console.log(`[verify-host-readiness] ${mark} ${label}`);
      return ok;
    }

    let ok = true;
    ok = gate(body.status === "ok" || body.status === "degraded", "status reachable") && ok;
    ok = gate(body.postgresConfigured === true, "postgresConfigured=true") && ok;

    const dep = /** @type {Record<string, unknown>} */ (body.databaseDeployment ?? {});
    ok =
      gate(
        dep.verified === true && dep.mode === "postgres",
        `databaseDeployment.verified (tail=${dep.tailTag ?? "unknown"})`,
      ) && ok;
    ok = gate(body.postgresFlipComplete === true, "postgresFlipComplete=true") && ok;
    ok = gate(body.memoryCaseDataActive === false, "memoryCaseDataActive=false") && ok;
    ok = gate(body.demoAuthEnabled === false, "demoAuthEnabled=false") && ok;

    const backends = /** @type {Record<string, string>} */ (body.backends ?? {});
    const badBackends = Object.entries(backends).filter(([key, value]) => {
      if (INTENTIONAL_MEMORY.has(key) && value === "memory") return false;
      return value !== "postgres";
    });
    ok =
      gate(
        badBackends.length === 0,
        `backends postgres (or intentional memory); ${badBackends.length} gap(s)`,
      ) && ok;
    if (badBackends.length > 0) {
      for (const [key, value] of badBackends) {
        console.log(`  - ${key}=${value}`);
      }
    }

    // Advisory only — log, never fail
    if (body.mfaEnabled !== true) {
      console.log(
        "[verify-host-readiness] NOTE mfaEnabled=false (advisory — MFA does not block casework)",
      );
    }
    if (body.emailEnabled !== true) {
      console.log("[verify-host-readiness] NOTE emailEnabled=false (advisory)");
    }
    if (body.cronConfigured !== true) {
      console.log("[verify-host-readiness] NOTE cronConfigured=false (advisory)");
    }

    // Keep ADVISORY_PRESENCE referenced so future edits notice the set.
    void ADVISORY_PRESENCE;

    if (!ok) process.exitCode = 1;
    else {
      console.log(
        `[verify-host-readiness] OK commit=${body.commit} version=${body.version}`,
      );
    }
  }
}
