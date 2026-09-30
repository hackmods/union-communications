/**
 * Operator error sinks — CapRover / Docker env toggles.
 * Not product analytics (ADR-006).
 * Primary store: Postgres when DATABASE_URL is set; file JSONL is fallback / dual-write.
 */

import type { ObservabilityBackend } from "@/lib/observability/types";

function envFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Loose env bag so unit tests can pass partial maps. */
export type EnvBag = Record<string, string | undefined>;

export type ObservabilityConfig = {
  backend: ObservabilityBackend;
  /** Dual-write to file when postgres is primary and file sink is also on. */
  fileDualWrite: boolean;
  sentryEnabled: boolean;
  sentryClientEnabled: boolean;
  sentryDsn: string | undefined;
  sentryMisconfigured: boolean;
  sentryClientServerMismatch: boolean;
  errorLogFileEnabled: boolean;
  errorLogFilePath: string | undefined;
  errorLogFileMisconfigured: boolean;
  errorLogFileMaxBytes: number;
  errorLogFileKeep: number;
};

export type ObservabilityHealth = {
  backend: ObservabilityBackend;
  storeEnabled: boolean;
  fileDualWrite: boolean;
  sentryEnabled: boolean;
  sentryClientEnabled: boolean;
  errorLogFileEnabled: boolean;
  sentryMisconfigured: boolean;
  errorLogFileMisconfigured: boolean;
  sentryClientServerMismatch: boolean;
};

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_KEEP = 3;

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  max: number,
): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function hasDatabaseUrl(env: EnvBag): boolean {
  return Boolean(env.DATABASE_URL?.trim());
}

/**
 * Resolve backend:
 * - explicit noop / file / postgres
 * - unset + DATABASE_URL → postgres (Docker default)
 * - unset + file sink → file
 * - else noop
 */
export function resolveObservabilityBackend(
  env: EnvBag = process.env,
): ObservabilityBackend {
  const raw = env.OBSERVABILITY_BACKEND?.trim().toLowerCase();
  if (raw === "noop") return "noop";
  if (raw === "file") return "file";
  if (raw === "postgres") {
    return hasDatabaseUrl(env) ? "postgres" : "noop";
  }
  if (hasDatabaseUrl(env)) return "postgres";
  const fileFlag = envFlag(env.ERROR_LOG_FILE_ENABLED);
  const filePath = env.ERROR_LOG_FILE_PATH?.trim();
  return fileFlag && filePath ? "file" : "noop";
}

export function resolveObservabilityConfig(
  env: EnvBag = process.env,
): ObservabilityConfig {
  const publicDsn = env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;
  const serverDsn = env.SENTRY_DSN?.trim() || publicDsn;
  const sentryFlag = envFlag(env.SENTRY_ENABLED);
  const fileFlag = envFlag(env.ERROR_LOG_FILE_ENABLED);
  const filePath = env.ERROR_LOG_FILE_PATH?.trim() || undefined;
  const sentryEnabled = sentryFlag && Boolean(serverDsn);
  const sentryClientEnabled = Boolean(publicDsn);
  const backend = resolveObservabilityBackend(env);
  const errorLogFileEnabled = fileFlag && Boolean(filePath);

  return {
    backend,
    fileDualWrite: backend === "postgres" && errorLogFileEnabled,
    sentryEnabled,
    sentryClientEnabled,
    sentryDsn: serverDsn,
    sentryMisconfigured: sentryFlag && !serverDsn,
    sentryClientServerMismatch: sentryEnabled && !sentryClientEnabled,
    errorLogFileEnabled,
    errorLogFilePath: filePath,
    errorLogFileMisconfigured: fileFlag && !filePath,
    errorLogFileMaxBytes: parsePositiveInt(
      env.ERROR_LOG_FILE_MAX_BYTES,
      DEFAULT_MAX_BYTES,
      500 * 1024 * 1024,
    ),
    errorLogFileKeep: parsePositiveInt(env.ERROR_LOG_FILE_KEEP, DEFAULT_KEEP, 20),
  };
}

export function errorLogFileMisconfigured(env: EnvBag = process.env): boolean {
  return resolveObservabilityConfig(env).errorLogFileMisconfigured;
}

export function buildObservabilityHealth(
  env: EnvBag = process.env,
): ObservabilityHealth {
  const cfg = resolveObservabilityConfig(env);
  const storeEnabled =
    cfg.backend === "postgres"
      ? hasDatabaseUrl(env)
      : cfg.backend === "file"
        ? cfg.errorLogFileEnabled
        : false;
  return {
    backend: storeEnabled ? cfg.backend : "noop",
    storeEnabled,
    fileDualWrite: cfg.fileDualWrite && storeEnabled,
    sentryEnabled: cfg.sentryEnabled,
    sentryClientEnabled: cfg.sentryClientEnabled,
    errorLogFileEnabled: cfg.errorLogFileEnabled,
    sentryMisconfigured: cfg.sentryMisconfigured,
    errorLogFileMisconfigured: cfg.errorLogFileMisconfigured,
    sentryClientServerMismatch: cfg.sentryClientServerMismatch,
  };
}
