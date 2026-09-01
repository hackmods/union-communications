import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import type { AttachmentScanStatus, DocumentRecord } from "@/types/attachments";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as downloadDocument } from "@/app/api/documents/[id]/download/route";
import {
  insertDocumentForTests,
  resetDocumentsMemoryForTests,
} from "./memory-adapter";
import { resetDocumentStore } from "./store";
import {
  getObjectStorage,
  resetObjectStorageCache,
} from "@/lib/attachments/storage";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-243",
      name: "Local 243 Steward",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function seedDoc(input?: {
  id?: string;
  unionId?: string;
  localId?: string;
  scanStatus?: AttachmentScanStatus;
  storageKey?: string;
  fileName?: string;
}): DocumentRecord {
  const id = input?.id ?? `doc-${Math.random().toString(36).slice(2, 8)}`;
  const doc: DocumentRecord = {
    id,
    unionId: input?.unionId ?? "union-opseu",
    localId: input?.localId ?? "local-243",
    title: "CBA excerpt",
    fileName: input?.fileName ?? "cba.pdf",
    mimeType: "application/pdf",
    sizeBytes: 12,
    storageKey: input?.storageKey ?? `union-opseu/local-243/document/${id}/${id}/cba.pdf`,
    scanStatus: input?.scanStatus ?? "clean",
    uploadedById: "user-steward-243",
    createdAt: "2026-08-01T00:00:00.000Z",
  };
  insertDocumentForTests(doc);
  return doc;
}

describe("document download API", () => {
  let dir: string;
  const previousLocalDir = process.env.ATTACHMENT_LOCAL_DIR;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "uo-docs-"));
    process.env.ATTACHMENT_LOCAL_DIR = dir;
    resetDocumentsMemoryForTests();
    resetDocumentStore();
    resetObjectStorageCache();
    authMock.mockReset();
  });

  afterEach(async () => {
    resetDocumentsMemoryForTests();
    resetDocumentStore();
    resetObjectStorageCache();
    if (previousLocalDir === undefined) {
      delete process.env.ATTACHMENT_LOCAL_DIR;
    } else {
      process.env.ATTACHMENT_LOCAL_DIR = previousLocalDir;
    }
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns 401 without a session and 403 for members", async () => {
    const doc = seedDoc();
    authMock.mockResolvedValue(null);
    expect(
      (await downloadDocument(new Request("http://localhost"), params(doc.id)))
        .status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await downloadDocument(
      new Request("http://localhost"),
      params(doc.id),
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for a missing id and for another union, including platform_admin", async () => {
    const foreign = seedDoc({
      unionId: "union-other",
      localId: "local-1",
    });

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const missing = await downloadDocument(
      new Request("http://localhost"),
      params("doc-does-not-exist"),
    );
    expect(missing.status).toBe(404);

    const crossUnion = await downloadDocument(
      new Request("http://localhost"),
      params(foreign.id),
    );
    expect(crossUnion.status).toBe(404);
    expect(await crossUnion.json()).toEqual({ error: "Not found" });
  });

  it("returns 404 when a steward from another local tries to download", async () => {
    const doc = seedDoc();
    authMock.mockResolvedValue(
      session({
        id: "user-steward-560",
        localId: "local-560",
        roles: ["local_steward"],
      }),
    );
    const res = await downloadDocument(
      new Request("http://localhost"),
      params(doc.id),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 403 when the scan is not clean or skipped_dev", async () => {
    const pending = seedDoc({ id: "doc-pending", scanStatus: "pending" });
    const infected = seedDoc({ id: "doc-infected", scanStatus: "infected" });
    authMock.mockResolvedValue(session());

    const pendingRes = await downloadDocument(
      new Request("http://localhost"),
      params(pending.id),
    );
    expect(pendingRes.status).toBe(403);
    expect(await pendingRes.json()).toEqual({
      error: "Document is not available for download",
    });

    const infectedRes = await downloadDocument(
      new Request("http://localhost"),
      params(infected.id),
    );
    expect(infectedRes.status).toBe(403);
  });

  it("returns the bytes with a private no-store attachment header", async () => {
    const doc = seedDoc({ scanStatus: "skipped_dev" });
    const bytes = Buffer.from("%PDF-1.4 test");
    await getObjectStorage().put(doc.storageKey, bytes, doc.mimeType);

    authMock.mockResolvedValue(session());
    const res = await downloadDocument(
      new Request("http://localhost"),
      params(doc.id),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Content-Disposition")).toContain("cba.pdf");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(bytes);
  });
});
