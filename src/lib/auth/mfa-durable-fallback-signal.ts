/**
 * Process-local signal when MFA durable Postgres paths fail or cannot use
 * memory failover. Surfaced on /api/health as an advisory (no secrets).
 */

export type MfaDurableFallbackKind =
  | "attempt_limit"
  | "pending_enrollment"
  | "session_grant"
  | "totp_counter"
  | "recovery_codes";

/**
 * Return diagnostic metadata without logging driver messages, which may embed
 * bound SQL values such as encrypted TOTP material or grant digests.
 */
export function mfaErrorMetadata(error: unknown): {
  errorType: string;
  sqlState?: string;
} {
  const errorType = error instanceof Error ? error.name : typeof error;
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") break;
    const record = current as { code?: unknown; cause?: unknown };
    if (typeof record.code === "string" && /^[0-9A-Z]{5}$/.test(record.code)) {
      return { errorType, sqlState: record.code };
    }
    current = record.cause;
  }
  return { errorType };
}

let lastFallbackAtMs = 0;
let lastFallbackKind: MfaDurableFallbackKind | null = null;

export function noteMfaDurableFallback(kind: MfaDurableFallbackKind): void {
  lastFallbackAtMs = Date.now();
  lastFallbackKind = kind;
}

export function mfaDurableFallbackRecently(windowMs = 15 * 60_000): boolean {
  if (!lastFallbackAtMs) return false;
  return Date.now() - lastFallbackAtMs <= windowMs;
}

export function getMfaDurableFallbackSignal(): {
  recent: boolean;
  kind: MfaDurableFallbackKind | null;
  atMs: number;
} {
  return {
    recent: mfaDurableFallbackRecently(),
    kind: lastFallbackKind,
    atMs: lastFallbackAtMs,
  };
}

/** @internal test helper */
export function resetMfaDurableFallbackSignalForTests(): void {
  lastFallbackAtMs = 0;
  lastFallbackKind = null;
}
