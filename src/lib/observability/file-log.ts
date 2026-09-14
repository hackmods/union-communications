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

export type ErrorLogRecord = {
  ts: string;
  level: "error";
  message: string;
  name?: string;
  stack?: string;
  digest?: string;
  route?: string;
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
 */
export async function appendServerErrorLog(
  error: unknown,
  meta?: { route?: string },
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
