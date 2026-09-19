import {
  appendFile,
  mkdir,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import {
  resolveObservabilityConfig,
  type EnvBag,
} from "@/lib/observability/config";
import {
  classifyServerError,
  type Classification,
} from "@/lib/observability/signal-classify";

/**
 * Server error JSONL record. `level` is the fan-out sink level (error / warn
 * / info) and `signal` is the recognised-benign tag (or null). Both fields
 * exist on every record for stable dashboard / grep shape.
 */
export type ErrorLogRecord = {
  ts: string;
  level: "error" | "warn" | "info";
  message: string;
  name?: string;
  stack?: string;
  digest?: string;
  route?: string;
  /**
   * BUILD_COMMIT_SHA from the image at the time the record was written. Lets
   * dashboards group `action.drift` and other deploy-time events by SHA.
   */
  build?: string;
  /** Recognised-benign tag (e.g. `auth.credentials_failed`, `action.drift`). */
  signal?: string | null;
  /** Free-form classifier metadata, e.g. extracted action ID. */
  meta?: Record<string, string | number | boolean | null>;
};

let warnedFsError = false;
let ensuredDir: string | null = null;

/** Reset warn / mkdir caches (unit tests). */
export function resetErrorFileLogState(): void {
  warnedFsError = false;
  ensuredDir = null;
}

function serializeError(error: unknown): Pick<
  ErrorLogRecord,
  "message" | "name" | "stack" | "digest"
> {
  if (error instanceof Error) {
    const digest =
      "digest" in error && typeof (error as { digest?: unknown }).digest === "string"
        ? (error as { digest: string }).digest
        : undefined;
    return {
      message: error.message || error.name || "Error",
      name: error.name,
      stack: error.stack,
      digest,
    };
  }
  return { message: String(error) };
}

/**
 * Rotate when current file exceeds maxBytes: path -> path.1 -> path.2 …
 * Drops the oldest keep index. Best-effort; never throws to caller.
 */
export async function rotateErrorLogIfNeeded(
  filePath: string,
  maxBytes: number,
  keep: number,
): Promise<void> {
  let size = 0;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return; // missing file is fine
  }
  if (size < maxBytes) return;

  try {
    await unlink(`${filePath}.${keep}`);
  } catch {
    /* ignore */
  }

  // Shift: path.(keep-1) -> path.keep, …, path.1 -> path.2, then path -> path.1
  for (let i = keep - 1; i >= 1; i -= 1) {
    try {
      await rename(`${filePath}.${i}`, `${filePath}.${i + 1}`);
    } catch {
      /* missing intermediate is fine */
    }
  }
  try {
    await rename(filePath, `${filePath}.1`);
  } catch {
    /* concurrent race — next write may still append */
  }
}

/**
 * Append one JSONL line when ERROR_LOG_FILE_ENABLED + path are set.
 * Rotates when over ERROR_LOG_FILE_MAX_BYTES. Never throws.
 *
 * The record level is determined by `classifyServerError` so callers don't
 * have to know about benign signals (auth.credentials_failed, action.drift).
 * Build commit + classifier signal ride along so dashboards can group.
 */
export async function appendServerErrorLog(
  error: unknown,
  meta?: { route?: string; build?: string },
  env: EnvBag = process.env,
): Promise<void> {
  const cfg = resolveObservabilityConfig(env);

  if (cfg.errorLogFileMisconfigured) {
    // Boot warn owns the operator message; stay quiet here to avoid duplicates.
    return;
  }

  if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) return;

  const filePath = cfg.errorLogFilePath;
  const dir = path.dirname(filePath);

  try {
    if (ensuredDir !== dir) {
      await mkdir(dir, { recursive: true });
      ensuredDir = dir;
    }

    await rotateErrorLogIfNeeded(
      filePath,
      cfg.errorLogFileMaxBytes,
      cfg.errorLogFileKeep,
    );

    const parts = serializeError(error);
    const classification: Classification = classifyServerError(error);
    const envBuild = process.env.BUILD_COMMIT_SHA?.trim();
    const build =
      meta?.build ?? (envBuild && envBuild.length > 0 ? envBuild : undefined);
    const record: ErrorLogRecord = {
      ts: new Date().toISOString(),
      level: classification.level,
      ...parts,
      ...(meta?.route ? { route: meta.route } : {}),
      ...(build ? { build } : {}),
      ...(classification.signal ? { signal: classification.signal } : {}),
    };

    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  } catch (err) {
    if (!warnedFsError) {
      warnedFsError = true;
      console.warn(
        "[observability] failed to write ERROR_LOG_FILE_PATH — further writes suppressed until restart",
        err instanceof Error ? err.message : err,
      );
    }
  }
}
