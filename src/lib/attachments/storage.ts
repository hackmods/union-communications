import { mkdir, readFile, unlink, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";

/**
 * Object storage for attachment / document bytes.
 *
 * ATTACHMENT_STORAGE=local (default) → filesystem under ATTACHMENT_LOCAL_DIR
 * ATTACHMENT_STORAGE=s3 → stub only (MinIO/S3/R2 deferred — FEAT-001)
 *
 * Encryption-at-rest (SSE-S3 / CMEK) is deferred with S3.
 */

export interface ObjectStorageAdapter {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export type AttachmentStorageMode = "local" | "s3";

export function resolveAttachmentStorageMode(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): AttachmentStorageMode {
  const raw = env.ATTACHMENT_STORAGE?.trim().toLowerCase();
  if (raw === "s3") return "s3";
  return "local";
}

export function resolveAttachmentLocalDir(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const configured = env.ATTACHMENT_LOCAL_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.resolve(process.cwd(), ".data", "attachments");
}

/** Sanitize a single path segment — strip traversal and unsafe chars. */
export function sanitizeStorageSegment(value: string): string {
  const cleaned = value
    .replace(/\.\./g, "_")
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.\-@]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 180);
  return cleaned || "file";
}

/**
 * Build a durable storage key (relative path / future S3 object key).
 * Example: union/local/grievance/g-1/att-xyz/evidence.pdf
 */
export function buildStorageKey(parts: {
  unionId: string;
  localId: string;
  scope: "grievance" | "bumping" | "document";
  scopeId: string;
  attachmentId: string;
  fileName: string;
}): string {
  const safeName = sanitizeStorageSegment(parts.fileName) || "file";
  return [
    sanitizeStorageSegment(parts.unionId),
    sanitizeStorageSegment(parts.localId),
    parts.scope,
    sanitizeStorageSegment(parts.scopeId),
    sanitizeStorageSegment(parts.attachmentId),
    safeName,
  ].join("/");
}

export class LocalFilesystemStorage implements ObjectStorageAdapter {
  constructor(private readonly rootDir: string) {}

  private resolveKey(key: string): string {
    const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (
      normalized.includes("..") ||
      path.isAbsolute(normalized) ||
      normalized.startsWith("memory:")
    ) {
      throw new Error("Invalid storage key");
    }
    const full = path.resolve(this.rootDir, ...normalized.split("/"));
    const root = path.resolve(this.rootDir);
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error("Storage key escapes root");
    }
    return full;
  }

  async put(key: string, bytes: Buffer, contentType?: string): Promise<void> {
    void contentType;
    const full = this.resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const full = this.resolveKey(key);
      return await readFile(full);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch {
      // ignore missing
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolveKey(key), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Stub for future S3-compatible storage (MinIO / R2 / AWS).
 * Configure ATTACHMENT_STORAGE=s3 only after a real client lands.
 */
export class S3ObjectStorageStub implements ObjectStorageAdapter {
  async put(): Promise<void> {
    throw new Error(
      "ATTACHMENT_STORAGE=s3 is not implemented yet — use local filesystem (default) or wire MinIO/S3",
    );
  }
  async get(): Promise<Buffer | null> {
    throw new Error("ATTACHMENT_STORAGE=s3 is not implemented yet");
  }
  async delete(): Promise<void> {
    throw new Error("ATTACHMENT_STORAGE=s3 is not implemented yet");
  }
  async exists(): Promise<boolean> {
    throw new Error("ATTACHMENT_STORAGE=s3 is not implemented yet");
  }
}

let cached: ObjectStorageAdapter | null = null;

export function getObjectStorage(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ObjectStorageAdapter {
  if (cached && env === process.env) return cached;
  const mode = resolveAttachmentStorageMode(env);
  const adapter =
    mode === "s3"
      ? new S3ObjectStorageStub()
      : new LocalFilesystemStorage(resolveAttachmentLocalDir(env));
  if (env === process.env) cached = adapter;
  return adapter;
}

/** @internal test helper */
export function resetObjectStorageCache(): void {
  cached = null;
}
