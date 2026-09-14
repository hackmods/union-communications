/**
 * Operator error sinks — CapRover / Docker env toggles.
 * Not product analytics (ADR-006). Defaults: both sinks off.
 */

function envFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Loose env bag so unit tests can pass partial maps. */
export type EnvBag = Record<string, string | undefined>;

export type ObservabilityConfig = {
  /** Server/edge: SENTRY_ENABLED=true and a DSN present. */
  sentryEnabled: boolean;
  /** Browser: non-empty NEXT_PUBLIC_SENTRY_DSN (build/runtime public). */
  sentryClientEnabled: boolean;
  sentryDsn: string | undefined;
  /** SENTRY_ENABLED=true but no DSN — sink will not send. */
  sentryMisconfigured: boolean;
  /**
   * Server Sentry is on but NEXT_PUBLIC_SENTRY_DSN is empty — browser errors
   * will not reach Sentry (public DSN is build-time for client bundles).
   */
  sentryClientServerMismatch: boolean;
  errorLogFileEnabled: boolean;
  errorLogFilePath: string | undefined;
  /** ERROR_LOG_FILE_ENABLED without path. */
  errorLogFileMisconfigured: boolean;
  /** Rotate when file exceeds this many bytes (default 10 MiB). */
  errorLogFileMaxBytes: number;
  /** How many rotated siblings to keep (default 3). */
  errorLogFileKeep: number;
};

/** Non-secret snapshot for `/api/health` (no DSN / paths with secrets). */
export type ObservabilityHealth = {
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

  return {
    sentryEnabled,
    sentryClientEnabled,
    sentryDsn: serverDsn,
    sentryMisconfigured: sentryFlag && !serverDsn,
    sentryClientServerMismatch: sentryEnabled && !sentryClientEnabled,
    errorLogFileEnabled: fileFlag && Boolean(filePath),
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

/** True when file logging was requested but path is missing. */
export function errorLogFileMisconfigured(env: EnvBag = process.env): boolean {
  return resolveObservabilityConfig(env).errorLogFileMisconfigured;
}

export function buildObservabilityHealth(
  env: EnvBag = process.env,
): ObservabilityHealth {
  const cfg = resolveObservabilityConfig(env);
  return {
    sentryEnabled: cfg.sentryEnabled,
    sentryClientEnabled: cfg.sentryClientEnabled,
    errorLogFileEnabled: cfg.errorLogFileEnabled,
    sentryMisconfigured: cfg.sentryMisconfigured,
    errorLogFileMisconfigured: cfg.errorLogFileMisconfigured,
    sentryClientServerMismatch: cfg.sentryClientServerMismatch,
  };
}
