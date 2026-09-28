/**
 * Load Lab feature flags, URL resolution, and production interlock.
 */

import type { LoadLabEnvName, LoadLabProfile } from "./types";

export const CAPACITY_TIERS = [50, 100, 250, 500, 1000] as const;

export const DEFAULT_DURATION_SEC = 60;
export const DEFAULT_RAMP_SEC = 15;
export const DEFAULT_SMOKE_VUS = 2;
export const DEFAULT_SMOKE_DURATION_SEC = 20;

/** Sustained abort thresholds (circuit breaker). */
export const ABORT_ERROR_RATE = 0.1;
export const ABORT_P95_MS = 5000;

export function isLoadLabEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.LOAD_LAB_ENABLED === "true";
}

export function isProductionLoadAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.ALLOW_PRODUCTION_LOAD_TEST === "true";
}

export function maxVusCap(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.LOAD_LAB_MAX_VUS ?? "1000");
  if (!Number.isFinite(raw) || raw < 1) return 1000;
  return Math.min(2000, Math.floor(raw));
}

export function maxDurationSecCap(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = Number(env.LOAD_LAB_MAX_DURATION_SEC ?? "900");
  if (!Number.isFinite(raw) || raw < 10) return 900;
  return Math.min(3600, Math.floor(raw));
}

export function resolveLoopbackBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const port = env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}`;
}

export function resolvePublicBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const authUrl = env.AUTH_URL?.trim();
  if (authUrl) return authUrl.replace(/\/$/, "");
  return null;
}

export function resolveBaseUrl(options: {
  envName: LoadLabEnvName;
  override?: string;
  preferLoopback?: boolean;
  env?: NodeJS.ProcessEnv;
}): string {
  const env = options.env ?? process.env;
  const override = options.override?.trim();
  if (override) return override.replace(/\/$/, "");

  if (options.envName === "local" || options.preferLoopback !== false) {
    // On-box default: hit loopback so traffic stays on the host.
    if (options.envName === "local" || options.preferLoopback) {
      return resolveLoopbackBaseUrl(env);
    }
  }

  const pub = resolvePublicBaseUrl(env);
  if (pub) return pub;
  return resolveLoopbackBaseUrl(env);
}

/**
 * Production interlock: production envName requires both flags + explicit allow.
 */
export function assertProductionInterlock(options: {
  envName: LoadLabEnvName;
  allowProduction?: boolean;
  env?: NodeJS.ProcessEnv;
}): { ok: true } | { ok: false; error: string } {
  const env = options.env ?? process.env;
  if (!isLoadLabEnabled(env)) {
    return {
      ok: false,
      error:
        "Load Lab is disabled. Set LOAD_LAB_ENABLED=true on this host to run tests.",
    };
  }
  if (options.envName !== "production") return { ok: true };
  if (!isProductionLoadAllowed(env)) {
    return {
      ok: false,
      error:
        "Production load tests require ALLOW_PRODUCTION_LOAD_TEST=true on this host.",
    };
  }
  if (!options.allowProduction) {
    return {
      ok: false,
      error:
        "Confirm production testing in the Lab (allowProduction) before starting.",
    };
  }
  return { ok: true };
}

export function profileNeedsAuth(profile: LoadLabProfile): boolean {
  return profile === "hub-read";
}

export function defaultVusForProfile(profile: LoadLabProfile): number {
  if (profile === "smoke") return DEFAULT_SMOKE_VUS;
  if (profile === "capacity") return CAPACITY_TIERS[0];
  return 50;
}
