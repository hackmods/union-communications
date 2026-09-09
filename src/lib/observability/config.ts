/**
 * Operator error sinks — CapRover / Docker env toggles.
 * Not product analytics (ADR-006). Defaults: both sinks off.
 */

function envFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export type ObservabilityConfig = {
  /** Server/edge: SENTRY_ENABLED=true and a DSN present. */
  sentryEnabled: boolean;
  /** Browser: non-empty NEXT_PUBLIC_SENTRY_DSN (build/runtime public). */
  sentryClientEnabled: boolean;
  sentryDsn: string | undefined;
  errorLogFileEnabled: boolean;
  errorLogFilePath: string | undefined;
};

/** Loose env bag so unit tests can pass partial maps. */
export type EnvBag = Record<string, string | undefined>;

export function resolveObservabilityConfig(
  env: EnvBag = process.env,
): ObservabilityConfig {
  const publicDsn = env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;
  const serverDsn = env.SENTRY_DSN?.trim() || publicDsn;
  const sentryFlag = envFlag(env.SENTRY_ENABLED);
  const fileFlag = envFlag(env.ERROR_LOG_FILE_ENABLED);
  const filePath = env.ERROR_LOG_FILE_PATH?.trim() || undefined;

  return {
    sentryEnabled: sentryFlag && Boolean(serverDsn),
    sentryClientEnabled: Boolean(publicDsn),
    sentryDsn: serverDsn,
    errorLogFileEnabled: fileFlag && Boolean(filePath),
    errorLogFilePath: filePath,
  };
}

/** True when file logging was requested but path is missing. */
export function errorLogFileMisconfigured(env: EnvBag = process.env): boolean {
  return envFlag(env.ERROR_LOG_FILE_ENABLED) && !env.ERROR_LOG_FILE_PATH?.trim();
}
