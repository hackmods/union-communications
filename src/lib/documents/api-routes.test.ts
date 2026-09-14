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

import {
  GET as listDocuments,
  POST as uploadDocument,
} from "@/app/api/documents/route";
import { DELETE as deleteDocument } from "@/app/api/documents/[id]/route";
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

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function seedDoc(input?: {
  id?: string;
  unionId?: string;
  localId?: string;
  title?: string;
  scanStatus?: AttachmentScanStatus;
  storageKey?: string;
  fileName?: string;
  uploadedById?: string;
}): DocumentRecord {
  const id = input?.id ?? `doc-${Math.random().toString(36).slice(2, 8)}`;
  const doc: DocumentRecord = {
    id,
    unionId: input?.unionId ?? "union-opseu",
    localId: input?.localId ?? "local-243",
    title: input?.title ?? "CBA excerpt",
    fileName: input?.fileName ?? "cba.pdf",
    mimeType: "application/pdf",
    sizeBytes: 12,
    storageKey: input?.storageKey ?? `union-opseu/local-243/document/${id}/${id}/cba.pdf`,
    scanStatus: input?.scanStatus ?? "clean",
    uploadedById: input?.uploadedById ?? "user-steward-243",
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

describe("document list/upload/delete API", () => {
  let dir: string;
  const previousLocalDir = process.env.ATTACHMENT_LOCAL_DIR;
  const previousScannerUrl = process.env.ATTACHMENT_SCANNER_URL;
  const previousScanMode = process.env.ATTACHMENT_SCAN_MODE;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "uo-docs-list-"));
    process.env.ATTACHMENT_LOCAL_DIR = dir;
    delete process.env.ATTACHMENT_SCANNER_URL;
    delete process.env.ATTACHMENT_SCAN_MODE;
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
    if (previousScannerUrl === undefined) {
      delete process.env.ATTACHMENT_SCANNER_URL;
    } else {
      process.env.ATTACHMENT_SCANNER_URL = previousScannerUrl;
    }
    if (previousScanMode === undefined) {
      delete process.env.ATTACHMENT_SCAN_MODE;
    } else {
      process.env.ATTACHMENT_SCAN_MODE = previousScanMode;
    }
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  function pdfPayload() {
    const bytes = Buffer.from("%PDF-1.4 test");
    return {
      bytes,
      body: {
        title: "CBA excerpt",
        fileName: "cba.pdf",
        mimeType: "application/pdf",
        sizeBytes: bytes.length,
        contentBase64: bytes.toString("base64"),
      },
    };
  }

  it("returns 401 without a session and 403 for members", async () => {
    seedDoc();
    authMock.mockResolvedValue(null);
    expect((await listDocuments()).status).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await listDocuments();
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    expect((await uploadDocument(jsonRequest(pdfPayload().body))).status).toBe(
      403,
    );
  });

  it("does not list another union, and pins a steward to their local", async () => {
    seedDoc({ id: "doc-mine", title: "Local 243 CBA" });
    seedDoc({
      id: "doc-other-union",
      unionId: "union-other",
      localId: "local-1",
      title: "Other union CBA",
    });
    seedDoc({
      id: "doc-other-local",
      localId: "local-560",
      title: "Other local CBA",
    });

    authMock.mockResolvedValue(session());
    const res = await listDocuments();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      documents: Array<{ id: string; title: string; unionId: string; localId: string }>;
    };
    expect(body.documents.every((d) => d.unionId === "union-opseu")).toBe(true);
    expect(body.documents.every((d) => d.localId === "local-243")).toBe(true);
    expect(body.documents.map((d) => d.id)).toEqual(["doc-mine"]);
    expect(body.documents.map((d) => d.title)).not.toContain("Other union CBA");
    expect(body.documents.map((d) => d.title)).not.toContain("Other local CBA");
  });

  it("never lists another union for union_admin, including when the session local is empty", async () => {
    seedDoc({ id: "doc-243" });
    seedDoc({
      id: "doc-560",
      localId: "local-560",
      title: "Sister local",
    });
    seedDoc({
      id: "doc-other-union",
      unionId: "union-other",
      localId: "local-1",
      title: "Other union CBA",
    });

    authMock.mockResolvedValue(
      session({ roles: ["union_admin"], localId: null }),
    );
    const res = await listDocuments();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      documents: Array<{ id: string; unionId: string }>;
    };
    expect(body.documents.every((d) => d.unionId === "union-opseu")).toBe(true);
    expect(body.documents.map((d) => d.id).sort()).toEqual([
      "doc-243",
      "doc-560",
    ]);
    expect(body.documents.map((d) => d.id)).not.toContain("doc-other-union");
  });

  it("rejects a missing payload, then stamps the session tenant and ignores forged union/local keys", async () => {
    const { body: payload, bytes } = pdfPayload();
    authMock.mockResolvedValue(session());
    const missing = await uploadDocument(
      jsonRequest({ title: "CBA excerpt", fileName: "cba.pdf" }),
    );
    expect(missing.status).toBe(400);

    const mismatch = await uploadDocument(
      jsonRequest({ ...payload, sizeBytes: bytes.length + 1 }),
    );
    expect(mismatch.status).toBe(400);

    const created = await uploadDocument(
      jsonRequest({
        ...payload,
        unionId: "union-other",
        localId: "local-evil",
        uploadedById: "attacker",
      }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      document: {
        unionId: string;
        localId: string;
        uploadedById: string;
        fileName: string;
        sizeBytes: number;
      };
    };
    expect(body.document.unionId).toBe("union-opseu");
    expect(body.document.localId).toBe("local-243");
    expect(body.document.uploadedById).toBe("user-steward-243");
    expect(body.document.fileName).toBe("cba.pdf");
    expect(body.document.sizeBytes).toBe(bytes.length);
  });

  it("returns 400 when the session has no local", async () => {
    authMock.mockResolvedValue(
      session({ roles: ["union_admin"], localId: null }),
    );
    const res = await uploadDocument(jsonRequest(pdfPayload().body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Union and local required" });
  });

  it("returns 404 for another union on delete, including platform_admin, and forbids a steward from deleting someone else's file", async () => {
    const foreign = seedDoc({
      id: "doc-foreign",
      unionId: "union-other",
      localId: "local-1",
    });
    const owned = seedDoc({ id: "doc-owned" });
    const otherSteward = seedDoc({
      id: "doc-peer",
      uploadedById: "user-steward-peer",
    });

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const crossUnion = await deleteDocument(
      new Request("http://localhost"),
      params(foreign.id),
    );
    expect(crossUnion.status).toBe(404);
    expect(await crossUnion.json()).toEqual({ error: "Not found" });

    authMock.mockResolvedValue(session());
    const forbidden = await deleteDocument(
      new Request("http://localhost"),
      params(otherSteward.id),
    );
    expect(forbidden.status).toBe(403);

    const deleted = await deleteDocument(
      new Request("http://localhost"),
      params(owned.id),
    );
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ ok: true });
  });
});
