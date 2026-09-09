import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  errorLogFileMisconfigured,
  resolveObservabilityConfig,
  type EnvBag,
} from "@/lib/observability/config";

export type ErrorLogRecord = {
  ts: string;
  level: "error";
  message: string;
  name?: string;
  stack?: string;
  digest?: string;
  route?: string;
};

let warnedMissingPath = false;
let warnedFsError = false;
let ensuredDir: string | null = null;

/** Reset warn / mkdir caches (unit tests). */
export function resetErrorFileLogState(): void {
  warnedMissingPath = false;
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
 * Append one JSONL line when ERROR_LOG_FILE_ENABLED + path are set.
 * Never throws — FS failures warn once then no-op.
 */
export async function appendServerErrorLog(
  error: unknown,
  meta?: { route?: string },
  env: EnvBag = process.env,
): Promise<void> {
  if (errorLogFileMisconfigured(env)) {
    if (!warnedMissingPath) {
      warnedMissingPath = true;
      console.warn(
        "[observability] ERROR_LOG_FILE_ENABLED=true but ERROR_LOG_FILE_PATH is empty — skipping file log",
      );
    }
    return;
  }

  const cfg = resolveObservabilityConfig(env);
  if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) return;

  const filePath = cfg.errorLogFilePath;
  const dir = path.dirname(filePath);

  try {
    if (ensuredDir !== dir) {
      await mkdir(dir, { recursive: true });
      ensuredDir = dir;
    }

    const parts = serializeError(error);
    const record: ErrorLogRecord = {
      ts: new Date().toISOString(),
      level: "error",
      ...parts,
      ...(meta?.route ? { route: meta.route } : {}),
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
