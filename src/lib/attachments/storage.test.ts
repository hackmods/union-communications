import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildStorageKey,
  LocalFilesystemStorage,
  resetObjectStorageCache,
  resolveAttachmentLocalDir,
  resolveAttachmentStorageMode,
  sanitizeStorageSegment,
} from "@/lib/attachments/storage";
import { MemoryAttachmentAdapter } from "@/lib/attachments/memory-adapter";
import { isDownloadAllowed, scanAttachmentStub } from "@/lib/attachments/scan";

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

  it("marks missing scanner as skipped_dev", () => {
    const result = scanAttachmentStub(
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
});
