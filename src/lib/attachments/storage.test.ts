import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import {
  buildStorageKey,
  LocalFilesystemStorage,
  resetObjectStorageCache,
  resolveAttachmentLocalDir,
  resolveAttachmentStorageMode,
  resolveS3StorageConfig,
  sanitizeStorageSegment,
  S3ObjectStorage,
} from "@/lib/attachments/storage";
import { MemoryAttachmentAdapter } from "@/lib/attachments/memory-adapter";
import {
  isDownloadAllowed,
  scanAttachment,
  scanAttachmentStub,
} from "@/lib/attachments/scan";

describe("attachment storage keys", () => {
  it("builds stable relative keys without traversal", () => {
    const key = buildStorageKey({
      unionId: "union-1",
      localId: "local-1",
      scope: "grievance",
      scopeId: "g-1",
      attachmentId: "att-1",
      fileName: "../../evil.pdf",
    });
    expect(key).toBe("union-1/local-1/grievance/g-1/att-1/evil.pdf");
    expect(key.includes("..")).toBe(false);
  });

  it("sanitizes path separators in segments", () => {
    expect(sanitizeStorageSegment("a/b\\c")).toBe("a_b_c");
  });

  it("defaults storage mode to local", () => {
    expect(resolveAttachmentStorageMode({})).toBe("local");
    expect(resolveAttachmentStorageMode({ ATTACHMENT_STORAGE: "s3" })).toBe(
      "s3",
    );
    expect(resolveAttachmentLocalDir({})).toMatch(/[\\/]\.data[\\/]attachments$/);
  });
});

describe("LocalFilesystemStorage", () => {
  let dir: string;

  afterEach(async () => {
    resetObjectStorageCache();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("round-trips put/get/exists/delete", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "uo-attach-"));
    const storage = new LocalFilesystemStorage(dir);
    const key = "u1/l1/grievance/g1/att1/note.pdf";
    const bytes = Buffer.from("%PDF-1.4 test");
    await storage.put(key, bytes, "application/pdf");
    expect(await storage.exists(key)).toBe(true);
    expect(await storage.get(key)).toEqual(bytes);
    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it("rejects keys that escape the root", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "uo-attach-"));
    const storage = new LocalFilesystemStorage(dir);
    await expect(
      storage.put("../outside.txt", Buffer.from("x"), "text/plain"),
    ).rejects.toThrow();
  });
});

describe("S3ObjectStorage (mocked client)", () => {
  it("resolves config with SSE-S3 AES256 by default", () => {
    const cfg = resolveS3StorageConfig({
      ATTACHMENT_S3_BUCKET: "vault",
      ATTACHMENT_S3_ACCESS_KEY_ID: "key",
      ATTACHMENT_S3_SECRET_ACCESS_KEY: "secret",
      ATTACHMENT_S3_ENDPOINT: "http://localhost:9000",
      ATTACHMENT_S3_FORCE_PATH_STYLE: "true",
    });
    expect(cfg.bucket).toBe("vault");
    expect(cfg.region).toBe("us-east-1");
    expect(cfg.endpoint).toBe("http://localhost:9000");
    expect(cfg.forcePathStyle).toBe(true);
    expect(cfg.serverSideEncryption).toBe("AES256");
  });

  it("puts with ServerSideEncryption and round-trips via mock", async () => {
    const objects = new Map<string, { body: Buffer; contentType: string }>();
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) {
        const input = command.input;
        expect(input.ServerSideEncryption).toBe("AES256");
        objects.set(input.Key!, {
          body: Buffer.from(input.Body as Buffer),
          contentType: input.ContentType ?? "",
        });
        return {};
      }
      if (command instanceof GetObjectCommand) {
        const row = objects.get(command.input.Key!);
        if (!row) {
          const err = new Error("missing") as Error & { name: string };
          err.name = "NoSuchKey";
          throw err;
        }
        return { Body: row.body };
      }
      if (command instanceof HeadObjectCommand) {
        if (!objects.has(command.input.Key!)) {
          const err = new Error("missing") as Error & {
            name: string;
            $metadata: { httpStatusCode: number };
          };
          err.name = "NotFound";
          err.$metadata = { httpStatusCode: 404 };
          throw err;
        }
        return {};
      }
      if (command instanceof DeleteObjectCommand) {
        objects.delete(command.input.Key!);
        return {};
      }
      throw new Error(`unexpected command ${String(command)}`);
    });

    const client = { send } as unknown as S3Client;
    const storage = new S3ObjectStorage(
      {
        region: "us-east-1",
        bucket: "vault",
        accessKeyId: "k",
        secretAccessKey: "s",
        forcePathStyle: true,
        serverSideEncryption: "AES256",
      },
      client,
    );

    const key = "u/l/document/d1/d1/file.pdf";
    const bytes = Buffer.from("%PDF-s3");
    await storage.put(key, bytes, "application/pdf");
    expect(await storage.exists(key)).toBe(true);
    expect(await storage.get(key)).toEqual(bytes);
    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
    expect(send).toHaveBeenCalled();
  });

  it.skipIf(!process.env.ATTACHMENT_S3_BUCKET)(
    "integration: live S3 when ATTACHMENT_S3_BUCKET is set",
    async () => {
      const storage = new S3ObjectStorage(resolveS3StorageConfig(process.env));
      const key = `ci-smoke/${Date.now()}.txt`;
      const bytes = Buffer.from("unionops-s3-smoke");
      await storage.put(key, bytes, "text/plain");
      expect(await storage.exists(key)).toBe(true);
      expect(await storage.get(key)).toEqual(bytes);
      await storage.delete(key);
    },
  );
});

describe("MemoryAttachmentAdapter + scan", () => {
  afterEach(() => {
    resetObjectStorageCache();
  });

  it("writes real bytes and returns a non-memory storageKey", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "uo-attach-mem-"));
    process.env.ATTACHMENT_LOCAL_DIR = dir;
    resetObjectStorageCache();

    const adapter = new MemoryAttachmentAdapter();
    const payload = Buffer.from("hello-pdf-body");
    const result = await adapter.createForGrievance(
      "g-test",
      {
        fileName: "evidence.pdf",
        mimeType: "application/pdf",
        sizeBytes: payload.length,
        contentBase64: payload.toString("base64"),
      },
      {
        unionId: "union-x",
        localId: "local-y",
        uploadedById: "user-1",
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.attachment?.storageKey).toMatch(
      /^union-x\/local-y\/grievance\/g-test\//,
    );
    expect(result.attachment?.storageKey.startsWith("memory://")).toBe(false);
    expect(result.attachment?.scanStatus).toBe("skipped_dev");
    expect(isDownloadAllowed(result.attachment!.scanStatus)).toBe(true);

    const bytes = await adapter.readBytes(result.attachment!.storageKey);
    expect(bytes?.toString()).toBe("hello-pdf-body");

    delete process.env.ATTACHMENT_LOCAL_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("marks missing scanner as skipped_dev", async () => {
    const result = await scanAttachment(
      {
        fileName: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12,
        contentBase64: Buffer.from("abcdefghijkl").toString("base64"),
      },
      {},
    );
    expect(result).toEqual({ ok: true, status: "skipped_dev" });
  });

  it("sync stub still skips when scanner unset", () => {
    expect(
      scanAttachmentStub(
        {
          fileName: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 4,
          contentBase64: Buffer.from("abcd").toString("base64"),
        },
        {},
      ),
    ).toEqual({ ok: true, status: "skipped_dev" });
  });

  it("posts to scanner and marks clean on JSON ok", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, infected: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const payload = Buffer.from("abcdefghijkl");
    const result = await scanAttachment(
      {
        fileName: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: payload.length,
        contentBase64: payload.toString("base64"),
      },
      { ATTACHMENT_SCANNER_URL: "http://clamav.local" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toEqual({ ok: true, status: "clean" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://clamav.local/scan",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("parses ClamAV stream: OK text", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("stream: OK", { status: 200 }),
    );
    const payload = Buffer.from("abcdefghijkl");
    const result = await scanAttachment(
      {
        fileName: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: payload.length,
        contentBase64: payload.toString("base64"),
      },
      { ATTACHMENT_SCANNER_URL: "http://scanner/scan" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.status).toBe("clean");
  });

  it("fails closed on scanner network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const payload = Buffer.from("abcdefghijkl");
    const result = await scanAttachment(
      {
        fileName: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: payload.length,
        contentBase64: payload.toString("base64"),
      },
      { ATTACHMENT_SCANNER_URL: "http://down" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe("pending");
  });

  it("skips on scanner error when ALLOW_SKIP_ON_ERROR", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const payload = Buffer.from("abcdefghijkl");
    const result = await scanAttachment(
      {
        fileName: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: payload.length,
        contentBase64: payload.toString("base64"),
      },
      {
        ATTACHMENT_SCANNER_URL: "http://down",
        ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR: "true",
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toEqual({ ok: true, status: "skipped_dev" });
  });
});
