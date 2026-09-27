#!/usr/bin/env node
/**
 * Post-deploy host readiness gate (mirrors src/lib/ops/host-readiness.ts).
 *
 * - Accepts intentional DATA_DB_BACKEND=memory
 * - MFA / email / cron are advisory outside the hosted customer profile
 * - Hosted customer deployments must attest current storage, scanner, backup,
 *   alert, and monitored public-contact evidence; the app cannot independently prove them
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

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15_000);
const readinessSecret = process.env.HOST_READINESS_SECRET?.trim();

/** @type {Response | undefined} */
let res;
try {
  res = await fetch(url, {
    signal: controller.signal,
    headers: readinessSecret
      ? { Authorization: `Bearer ${readinessSecret}` }
      : undefined,
  });
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
    const hostedModeRequired = process.env.REQUIRE_HOSTED_CUSTOMER_MODE === "true";
    ok = gate(
      !hostedModeRequired || body.hostedCustomerMode === true,
      hostedModeRequired
        ? "hosted customer mode enabled"
        : "hosted customer mode is optional for this target",
    ) && ok;
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

    if (body.hostedCustomerMode === true) {
      const evidenceAvailable =
        typeof body.hostedControlEvidence === "object" &&
        body.hostedControlEvidence !== null;
      ok = gate(
        evidenceAvailable,
        "private hosted operational evidence is available (set HOST_READINESS_SECRET on host and CI)",
      ) && ok;

      ok = gate(
        body.mfaEnabled === true && body.mfaMode === "totp",
        "hosted customer production TOTP",
      ) && ok;

      const controls = /** @type {Record<string, unknown>} */ (
        body.hostedControlEvidence ?? {}
      );
      ok = gate(
        controls.attachmentStorageApproved === true,
        "operator-attested attachment storage approval is current",
      ) && ok;
      ok = gate(
        controls.strictUploadScan === true,
        "strict upload scanner is configured and recently tested",
      ) && ok;
      ok = gate(
        controls.backupRestoreEvidence === true,
        "operator-attested backup and restore evidence is current",
      ) && ok;
      ok = gate(
        controls.alertDeliveryEvidence === true,
        "operator-attested alert delivery evidence is current",
      ) && ok;
      ok = gate(
        controls.publicLegalContacts === true,
        "public legal identity and monitored role contacts are configured and current",
      ) && ok;
    }

    const registry = /** @type {Record<string, unknown>} */ (body.tenantRegistry ?? {});
    ok =
      gate(
        registry.seeded === true,
        `tenantRegistry.seeded (unionCount=${registry.unionCount ?? "unknown"})`,
      ) && ok;

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

    // Advisory outside the hosted customer profile.
    if (body.mfaEnabled !== true) {
      console.log(
        "[verify-host-readiness] NOTE mfaEnabled=false (advisory outside hosted customer mode)",
      );
    }
    if (body.emailEnabled !== true) {
      console.log("[verify-host-readiness] NOTE emailEnabled=false (advisory)");
    }
    if (body.cronConfigured !== true) {
      console.log("[verify-host-readiness] NOTE cronConfigured=false (advisory)");
    }

    if (!ok) process.exitCode = 1;
    else {
      console.log(
        `[verify-host-readiness] OK commit=${body.commit} version=${body.version}`,
      );
    }
  }
}
