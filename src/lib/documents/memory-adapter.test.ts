import { afterEach, describe, expect, it } from "vitest";
import type { DocumentRecord } from "@/types/attachments";
import { MemoryDocumentAdapter, insertDocumentForTests, resetDocumentsMemoryForTests } from "./memory-adapter";

afterEach(() => resetDocumentsMemoryForTests());

function doc(id: string, visibility: "local_shared" | "restricted", uploadedById = "uploader"): DocumentRecord {
  return {
    id, unionId: "union-a", localId: "local-a", title: id, fileName: `${id}.pdf`,
    mimeType: "application/pdf", sizeBytes: 12, storageKey: `union-a/local-a/document/${id}/${id}/${id}.pdf`,
    scanStatus: "clean", uploadedById, visibility, createdAt: "2026-09-27T00:00:00.000Z",
  };
}

describe("memory document visibility", () => {
  it("keeps shared records officer-only and restricted records creator/grant-only", async () => {
    const store = new MemoryDocumentAdapter();
    insertDocumentForTests(doc("shared", "local_shared"));
    insertDocumentForTests(doc("restricted", "restricted"));
    await store.setAccessGrants("restricted", ["grantee"], "uploader");

    expect(await store.getById("shared", "member", false)).toBeNull();
    expect((await store.getById("shared", "officer", true))?.id).toBe("shared");
    expect(await store.getById("restricted", "member", false)).toBeNull();
    expect((await store.getById("restricted", "grantee", false))?.id).toBe("restricted");
    expect((await store.getById("restricted", "uploader", false))?.id).toBe("restricted");
    expect((await store.list({ unionId: "union-a", localId: "local-a", userId: "grantee", canReadShared: false })).map((row) => row.id)).toEqual(["restricted"]);
  });
});
