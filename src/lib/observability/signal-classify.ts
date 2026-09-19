/**
 * Pure classifier for "expected noise" errors.
 *
 * Both Sentry and the JSONL server error sink are tuned to inflate a small
 * number of recurring-but-benign error patterns: `CredentialsSignin` (real
 * users typing wrong passwords) and `Failed to find Server Action …`
 * (per-build action IDs invalidated by a deploy). Without classification,
 * these dominate the operator's error stream and crowd out real defects.
 *
 * The classifier is shared by:
 *  - `report-server-error.ts` (server fan-out)
 *  - `capture-client-route-error.ts` (client error boundary)
 *  - `file-log.ts` (JSONL append path)
 *
 * It never throws; unknown errors pass through with level=error, signal=null
 * so existing callers keep their behaviour.
 */

/** Closed set of recognised benign error signals. */
export type ErrorSignal =
  | "auth.credentials_failed"
  | "action.drift"
  | null;

export type Classification = {
  /** Sink level to record this error at. */
  level: "error" | "warn" | "info";
  /** Tag attached to the recorded record so dashboards can group. */
  signal: ErrorSignal;
};

/**
 * Inspect an unknown error (server or client) and decide what to do with it.
 * Returns `{ level: "error", signal: null }` when nothing matches so default
 * behaviour is preserved for everything else.
 */
export function classifyServerError(errorLike: unknown): Classification {
  const message = messageOf(errorLike);
  const name = nameOf(errorLike);

  // Auth.js credentials authorize() returning null ends up here as a
  // CredentialsSignin-shaped record. Auth.js's own logger names it, so we
  // match the name first; fall through to substring for wrapped payloads.
  if (
    name === "CredentialsSignin" ||
    message.includes("CredentialsSignin")
  ) {
    return { level: "warn", signal: "auth.credentials_failed" };
  }

  // Next.js server-action post-deploy staleness. Message format:
  //   "Failed to find Server Action <hash>"
  // Catches both the bare form (no hash from older builds) and the hashed form.
  if (
    message === "Failed to find Server Action" ||
    message.startsWith("Failed to find Server Action ") ||
    /Failed to find Server Action \S+/.test(message)
  ) {
    return { level: "info", signal: "action.drift" };
  }

  return { level: "error", signal: null };
}

function messageOf(errorLike: unknown): string {
  if (errorLike == null) return "";
  if (typeof errorLike === "string") return errorLike;
  if (errorLike instanceof Error) {
    return typeof errorLike.message === "string" ? errorLike.message : "";
  }
  if (typeof errorLike === "object") {
    const m = (errorLike as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return String(errorLike);
  } catch {
    return "";
  }
}

function nameOf(errorLike: unknown): string {
  if (errorLike instanceof Error) {
    return typeof errorLike.name === "string" ? errorLike.name : "";
  }
  if (errorLike && typeof errorLike === "object") {
    const n = (errorLike as { name?: unknown }).name;
    if (typeof n === "string") return n;
  }
  return "";
}
