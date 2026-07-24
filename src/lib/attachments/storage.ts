import { mkdir, readFile, unlink, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

/**
 * Object storage for attachment / document bytes.
 *
 * ATTACHMENT_STORAGE=local (default) → filesystem under ATTACHMENT_LOCAL_DIR
 * ATTACHMENT_STORAGE=s3 → S3-compatible (MinIO / Cloudflare R2 / AWS) via @aws-sdk/client-s3
 *
 * Encryption-at-rest: local volume encryption is an operator concern; S3 puts use
 * SSE-S3 AES256 by default (`ATTACHMENT_S3_SSE=AES256`). CMEK remains optional.
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
 * Build a durable storage key (relative path / S3 object key).
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

export type S3StorageConfig = {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle: boolean;
  /** SSE-S3 algorithm; omit / "none" disables ServerSideEncryption on PutObject. */
  serverSideEncryption?: "AES256";
};

export function resolveS3StorageConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): S3StorageConfig {
  const bucket = env.ATTACHMENT_S3_BUCKET?.trim();
  if (!bucket) {
    throw new Error(
      "ATTACHMENT_STORAGE=s3 requires ATTACHMENT_S3_BUCKET (and credentials)",
    );
  }
  const accessKeyId =
    env.ATTACHMENT_S3_ACCESS_KEY_ID?.trim() ||
    env.AWS_ACCESS_KEY_ID?.trim() ||
    "";
  const secretAccessKey =
    env.ATTACHMENT_S3_SECRET_ACCESS_KEY?.trim() ||
    env.AWS_SECRET_ACCESS_KEY?.trim() ||
    "";
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "ATTACHMENT_STORAGE=s3 requires ATTACHMENT_S3_ACCESS_KEY_ID / ATTACHMENT_S3_SECRET_ACCESS_KEY (or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)",
    );
  }

  const sseRaw = (env.ATTACHMENT_S3_SSE ?? "AES256").trim().toUpperCase();
  const serverSideEncryption =
    sseRaw === "" || sseRaw === "NONE" || sseRaw === "OFF"
      ? undefined
      : ("AES256" as const);

  const forcePathStyle =
    env.ATTACHMENT_S3_FORCE_PATH_STYLE?.trim().toLowerCase() === "true" ||
    env.ATTACHMENT_S3_FORCE_PATH_STYLE === "1";

  return {
    region: env.ATTACHMENT_S3_REGION?.trim() || "us-east-1",
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint: env.ATTACHMENT_S3_ENDPOINT?.trim() || undefined,
    forcePathStyle,
    serverSideEncryption,
  };
}

function createS3Client(config: S3StorageConfig): S3Client {
  const clientConfig: S3ClientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  };
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }
  return new S3Client(clientConfig);
}

async function streamToBuffer(
  body: unknown,
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body === "string") return Buffer.from(body);
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  if (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body
  ) {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<unknown>) {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as ArrayBufferLike),
      );
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported S3 object body type");
}

/**
 * S3-compatible object storage (AWS S3, MinIO, Cloudflare R2).
 * Pass a mock `S3Client` in tests; production uses `createS3Client`.
 */
export class S3ObjectStorage implements ObjectStorageAdapter {
  private readonly client: S3Client;

  constructor(
    private readonly config: S3StorageConfig,
    client?: S3Client,
  ) {
    this.client = client ?? createS3Client(config);
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        ...(this.config.serverSideEncryption
          ? { ServerSideEncryption: this.config.serverSideEncryption }
          : {}),
      }),
    );
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const out = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return await streamToBuffer(out.Body);
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: string }).name)
          : "";
      const status =
        err && typeof err === "object" && "$metadata" in err
          ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode
          : undefined;
      if (name === "NoSuchKey" || name === "NotFound" || status === 404) {
        return null;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
    } catch {
      // ignore missing / delete errors (parity with local adapter)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: string }).name)
          : "";
      const status =
        err && typeof err === "object" && "$metadata" in err
          ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode
          : undefined;
      if (
        name === "NotFound" ||
        name === "NoSuchKey" ||
        status === 404 ||
        status === 403
      ) {
        return false;
      }
      throw err;
    }
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
      ? new S3ObjectStorage(resolveS3StorageConfig(env))
      : new LocalFilesystemStorage(resolveAttachmentLocalDir(env));
  if (env === process.env) cached = adapter;
  return adapter;
}

/** @internal test helper */
export function resetObjectStorageCache(): void {
  cached = null;
}
