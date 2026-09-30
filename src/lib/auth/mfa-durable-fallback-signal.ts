/**
 * Process-local signal when MFA durable Postgres paths fall back to memory.
 * Surfaced on /api/health as an advisory (no secrets).
 */

export type MfaDurableFallbackKind =
  | "attempt_limit"
  | "pending_enrollment"
  | "session_grant"
  | "totp_counter"
  | "recovery_codes";

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
