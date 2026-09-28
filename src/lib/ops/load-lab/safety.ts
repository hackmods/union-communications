/**
 * Safety harness for on-box Load Lab — target allowlist, wall-clock kill,
 * sample bounds, mid-tier circuit breaker helpers.
 */

import {
  resolveLoopbackBaseUrl,
  resolvePublicBaseUrl,
} from "./env";

/** Absolute wall-clock cap for an entire multi-tier run (default 20 min). */
export function maxRunWallClockSec(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = Number(env.LOAD_LAB_MAX_RUN_SEC ?? "1200");
  if (!Number.isFinite(raw) || raw < 30) return 1200;
  return Math.min(3600, Math.floor(raw));
}

/** Soft cap on retained latency samples to avoid OOM during intense tiers. */
export const MAX_RETAINED_SAMPLES = 8_000;

/** Mid-tier check: after this many samples, evaluate circuit breaker. */
export const MID_TIER_MIN_SAMPLES = 40;

export function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "[::1]"
  );
}

/**
 * Only allow hammering this host (loopback or AUTH_URL host).
 * Blocks SSRF / accidental external DDoS via baseUrl override.
 */
export function assertAllowedTargetUrl(
  baseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ok: false, error: "Target URL is not a valid absolute URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Target URL must be http or https." };
  }

  if (isLoopbackHostname(parsed.hostname)) {
    return { ok: true };
  }

  const allowedHosts = new Set<string>();
  const pub = resolvePublicBaseUrl(env);
  if (pub) {
    try {
      allowedHosts.add(new URL(pub).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  // CapRover often sets AUTH_URL; also accept bare hostname env if present.
  const authHost = env.AUTH_URL?.trim();
  if (authHost) {
    try {
      allowedHosts.add(new URL(authHost).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }

  if (allowedHosts.has(parsed.hostname.toLowerCase())) {
    return { ok: true };
  }

  return {
    ok: false,
    error: `Target host "${parsed.hostname}" is not allowed. Use loopback (${resolveLoopbackBaseUrl(env)}) or this host's AUTH_URL only.`,
  };
}

/** Keep capacity stages that fit under the VU cap; mark the rest skipped. */
export function filterCapacityTiers(
  tiers: readonly number[],
  maxVus: number,
): { run: number[]; skipped: number[] } {
  const run: number[] = [];
  const skipped: number[] = [];
  for (const v of tiers) {
    if (v <= maxVus) run.push(v);
    else skipped.push(v);
  }
  // If every tier is above the cap, still run one stage at the cap.
  if (run.length === 0 && maxVus >= 1) {
    run.push(maxVus);
  }
  return { run, skipped };
}

export type RollingStats = {
  count: number;
  errors: number;
  timeouts: number;
  authFailures: number;
  /** Reservoir of recent latencies for percentile estimates. */
  latenciesMs: number[];
};

export function createRollingStats(): RollingStats {
  return {
    count: 0,
    errors: 0,
    timeouts: 0,
    authFailures: 0,
    latenciesMs: [],
  };
}

export function recordSample(
  stats: RollingStats,
  sample: {
    ms: number;
    ok: boolean;
    timeout?: boolean;
    authFailure?: boolean;
  },
  maxRetained = MAX_RETAINED_SAMPLES,
): void {
  stats.count += 1;
  if (!sample.ok) stats.errors += 1;
  if (sample.timeout) stats.timeouts += 1;
  if (sample.authFailure) stats.authFailures += 1;
  if (stats.latenciesMs.length < maxRetained) {
    stats.latenciesMs.push(sample.ms);
  } else {
    // Reservoir: randomly replace so percentiles stay representative.
    const idx = Math.floor(Math.random() * stats.count);
    if (idx < maxRetained) stats.latenciesMs[idx] = sample.ms;
  }
}

export function midTierShouldAbort(
  stats: RollingStats,
  abortErrorRate: number,
  abortP95Ms: number,
  percentileFn: (sorted: number[], p: number) => number,
): { abort: boolean; reason?: string } {
  if (stats.count < MID_TIER_MIN_SAMPLES) return { abort: false };
  const errorRate = stats.errors / stats.count;
  if (errorRate >= abortErrorRate) {
    return {
      abort: true,
      reason: `mid-tier error rate ${(errorRate * 100).toFixed(1)}% ≥ ${abortErrorRate * 100}%`,
    };
  }
  const sorted = [...stats.latenciesMs].sort((a, b) => a - b);
  const p95 = percentileFn(sorted, 95);
  if (p95 >= abortP95Ms) {
    return {
      abort: true,
      reason: `mid-tier p95 ${Math.round(p95)}ms ≥ ${abortP95Ms}ms`,
    };
  }
  return { abort: false };
}
