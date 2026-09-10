import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import type { AttachmentMeta, AttachmentScanStatus } from "@/types/attachments";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listGrievanceAttachments,
  POST as uploadGrievanceAttachment,
} from "@/app/api/grievances/[id]/attachments/route";
import { GET as downloadGrievanceAttachment } from "@/app/api/grievances/[id]/attachments/[attachmentId]/download/route";
import {
  GET as listBumpingAttachments,
  POST as uploadBumpingAttachment,
} from "@/app/api/bumping/cases/[id]/attachments/route";
import { GET as downloadBumpingAttachment } from "@/app/api/bumping/cases/[id]/attachments/[attachmentId]/download/route";
import {
  insertAttachmentForTests,
  resetAttachmentMemoryForTests,
} from "./memory-adapter";
import { resetAttachmentStore } from "./store";
import {
  getObjectStorage,
  resetObjectStorageCache,
} from "@/lib/attachments/storage";
import {
  memoryGrievanceStore,
  resetGrievanceMemoryForTests,
} from "@/lib/grievance/memory-adapter";
import { resetGrievanceStore } from "@/lib/grievance/store";
import {
  memoryBumpingStore,
  resetBumpingMemoryForTests,
} from "@/lib/bumping/memory-adapter";
import { resetBumpingStore } from "@/lib/bumping/store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  name?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: input?.name ?? "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string, attachmentId?: string) {
  return {
    params: Promise.resolve(
      attachmentId ? { id, attachmentId } : { id },
    ),
  };
}

const pdfBytes = Buffer.from("%PDF-1.4 evidence");
const pdfUpload = {
  fileName: 'memo "draft".pdf',
  mimeType: "application/pdf",
  sizeBytes: pdfBytes.length,
  contentBase64: pdfBytes.toString("base64"),
};

function seedAttachment(input: {
  id: string;
  grievanceId?: string;
  bumpingCaseId?: string;
  unionId?: string;
  localId?: string;
  scanStatus?: AttachmentScanStatus;
  fileName?: string;
  storageKey?: string;
}): AttachmentMeta {
  const id = input.id;
  const unionId = input.unionId ?? "union-opseu";
  const localId = input.localId ?? "local-243";
  const fileName = input.fileName ?? pdfUpload.fileName;
  const storageKey =
    input.storageKey ??
    `${unionId}/${localId}/${input.grievanceId ? "grievance" : "bumping"}/${input.grievanceId ?? input.bumpingCaseId}/${id}/${fileName.replace(/"/g, "")}`;
  return insertAttachmentForTests({
    id,
    unionId,
    localId,
    grievanceId: input.grievanceId,
    bumpingCaseId: input.bumpingCaseId,
    fileName,
    mimeType: "application/pdf",
    sizeBytes: pdfBytes.length,
    storageKey,
    scanStatus: input.scanStatus ?? "skipped_dev",
    uploadedById: "user-steward-243",
    createdAt: "2026-09-01T00:00:00.000Z",
  });
}

describe("grievance and bumping attachment HTTP routes", () => {
  let dir: string;
  const previousLocalDir = process.env.ATTACHMENT_LOCAL_DIR;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "uo-att-http-"));
    process.env.ATTACHMENT_LOCAL_DIR = dir;
    resetAttachmentMemoryForTests();
    resetAttachmentStore();
    resetObjectStorageCache();
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    resetBumpingMemoryForTests();
    resetBumpingStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(async () => {
    resetAttachmentMemoryForTests();
    resetAttachmentStore();
    resetObjectStorageCache();
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    resetBumpingMemoryForTests();
    resetBumpingStore();
    resetTenantOverlayForTests();
    if (previousLocalDir === undefined) {
      delete process.env.ATTACHMENT_LOCAL_DIR;
    } else {
      process.env.ATTACHMENT_LOCAL_DIR = previousLocalDir;
    }
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  describe("GET/POST /api/grievances/[id]/attachments", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect(
        (
          await listGrievanceAttachments(
            new Request("http://localhost"),
            params("grev-001"),
          )
        ).status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listGrievanceAttachments(
        new Request("http://localhost"),
        params("grev-001"),
      );
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lets the assigned steward list grev-001 and 404s an unassigned case", async () => {
      seedAttachment({ id: "att-own", grievanceId: "grev-001" });
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          name: "Local 243 Steward",
          roles: ["local_steward"],
        }),
      );

      const own = await listGrievanceAttachments(
        new Request("http://localhost"),
        params("grev-001"),
      );
      expect(own.status).toBe(200);
      const body = (await own.json()) as {
        attachments: Array<{ id: string }>;
      };
      expect(body.attachments.some((a) => a.id === "att-own")).toBe(true);

      const other = await listGrievanceAttachments(
        new Request("http://localhost"),
        params("grev-002"),
      );
      expect(other.status).toBe(404);
      expect(await other.json()).toEqual({ error: "Not found" });
    });

    it("returns 404 for a missing id and for another union, including platform_admin", async () => {
      const foreign = await memoryGrievanceStore.create(
        { category: "Other union", filedAt: "2026-01-01T00:00:00.000Z" },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-x",
          assignedStewardId: "user-x",
        },
      );
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));

      expect(
        (
          await listGrievanceAttachments(
            new Request("http://localhost"),
            params("grev-missing"),
          )
        ).status,
      ).toBe(404);

      const crossUnion = await listGrievanceAttachments(
        new Request("http://localhost"),
        params(foreign.grievance.id),
      );
      expect(crossUnion.status).toBe(404);
      expect(await crossUnion.json()).toEqual({ error: "Not found" });
    });

    it("lets a president read the local case and not a sister local", async () => {
      authMock.mockResolvedValue(session());
      expect(
        (
          await listGrievanceAttachments(
            new Request("http://localhost"),
            params("grev-002"),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await listGrievanceAttachments(
            new Request("http://localhost"),
            params("grev-003"),
          )
        ).status,
      ).toBe(404);
    });

    it("rejects incomplete uploads then stamps case tenant and session uploader", async () => {
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          name: "Local 243 Steward",
          roles: ["local_steward"],
        }),
      );

      const missing = await uploadGrievanceAttachment(
        jsonRequest({ fileName: "a.pdf" }),
        params("grev-001"),
      );
      expect(missing.status).toBe(400);

      const noBytes = await uploadGrievanceAttachment(
        jsonRequest({
          fileName: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 4,
        }),
        params("grev-001"),
      );
      expect(noBytes.status).toBe(400);

      const sizeMismatch = await uploadGrievanceAttachment(
        jsonRequest({ ...pdfUpload, sizeBytes: 1 }),
        params("grev-001"),
      );
      expect(sizeMismatch.status).toBe(400);

      const created = await uploadGrievanceAttachment(
        jsonRequest(pdfUpload),
        params("grev-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        attachment: {
          unionId: string;
          localId: string;
          grievanceId: string;
          uploadedById: string;
          scanStatus: string;
        };
      };
      expect(body.attachment.unionId).toBe("union-opseu");
      expect(body.attachment.localId).toBe("local-243");
      expect(body.attachment.grievanceId).toBe("grev-001");
      expect(body.attachment.uploadedById).toBe("user-steward-243");
      expect(body.attachment.scanStatus).toBe("skipped_dev");
    });

    it("404s a steward upload on an unassigned case and a local_exec write", async () => {
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          roles: ["local_steward"],
        }),
      );
      expect(
        (
          await uploadGrievanceAttachment(
            jsonRequest(pdfUpload),
            params("grev-002"),
          )
        ).status,
      ).toBe(404);

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect(
        (
          await uploadGrievanceAttachment(
            jsonRequest(pdfUpload),
            params("grev-001"),
          )
        ).status,
      ).toBe(404);
    });
  });

  describe("GET /api/grievances/[id]/attachments/[attachmentId]/download", () => {
    it("returns 404 when the attachment belongs to a different case", async () => {
      const row = seedAttachment({ id: "att-grev-001", grievanceId: "grev-001" });
      await getObjectStorage().put(row.storageKey, pdfBytes, row.mimeType);
      authMock.mockResolvedValue(session());

      const res = await downloadGrievanceAttachment(
        new Request("http://localhost"),
        params("grev-002", row.id),
      );
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found" });
    });

    it("returns 403 when the scan is not clean or skipped_dev", async () => {
      const pending = seedAttachment({
        id: "att-pending",
        grievanceId: "grev-001",
        scanStatus: "pending",
      });
      const infected = seedAttachment({
        id: "att-infected",
        grievanceId: "grev-001",
        scanStatus: "infected",
      });
      authMock.mockResolvedValue(session());

      const pendingRes = await downloadGrievanceAttachment(
        new Request("http://localhost"),
        params("grev-001", pending.id),
      );
      expect(pendingRes.status).toBe(403);
      expect(await pendingRes.json()).toEqual({
        error: "Attachment is not available for download",
      });

      const infectedRes = await downloadGrievanceAttachment(
        new Request("http://localhost"),
        params("grev-001", infected.id),
      );
      expect(infectedRes.status).toBe(403);
    });

    it("returns the bytes with a private no-store header and stripped filename quotes", async () => {
      const row = seedAttachment({
        id: "att-clean",
        grievanceId: "grev-001",
        scanStatus: "skipped_dev",
      });
      await getObjectStorage().put(row.storageKey, pdfBytes, row.mimeType);
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          roles: ["local_steward"],
        }),
      );

      const res = await downloadGrievanceAttachment(
        new Request("http://localhost"),
        params("grev-001", row.id),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="memo draft.pdf"',
      );
      expect(Buffer.from(await res.arrayBuffer())).toEqual(pdfBytes);
    });
  });

  describe("GET/POST /api/bumping/cases/[id]/attachments", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect(
        (
          await listBumpingAttachments(
            new Request("http://localhost"),
            params("bump-001"),
          )
        ).status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listBumpingAttachments(
        new Request("http://localhost"),
        params("bump-001"),
      );
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lets a steward list but 404s an upload, and lets a stability_member write", async () => {
      seedAttachment({ id: "att-bump", bumpingCaseId: "bump-001" });
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          roles: ["local_steward"],
        }),
      );
      const listed = await listBumpingAttachments(
        new Request("http://localhost"),
        params("bump-001"),
      );
      expect(listed.status).toBe(200);
      expect(
        (
          await uploadBumpingAttachment(
            jsonRequest(pdfUpload),
            params("bump-001"),
          )
        ).status,
      ).toBe(404);

      authMock.mockResolvedValue(
        session({
          id: "user-stability-243",
          roles: ["stability_member"],
        }),
      );
      const created = await uploadBumpingAttachment(
        jsonRequest(pdfUpload),
        params("bump-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        attachment: { unionId: string; localId: string; uploadedById: string };
      };
      expect(body.attachment.unionId).toBe("union-opseu");
      expect(body.attachment.localId).toBe("local-243");
      expect(body.attachment.uploadedById).toBe("user-stability-243");
    });

    it("returns 404 for another union even as platform_admin and 403 when bumping is off", async () => {
      const position = {
        title: "Clerk",
        duties: "Filing",
        qualifications: "None",
        seniorityNotes: "n/a",
      };
      const foreign = await memoryBumpingStore.create(
        {
          memberRef: "Foreign",
          seniorityDate: "2019-01-01",
          currentPosition: "Clerk",
          targetPosition: "Clerk II",
          scenario: "Cross-union seed",
          incumbentPosition: position,
          bumpingPosition: position,
        },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-x",
        },
      );
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const crossUnion = await listBumpingAttachments(
        new Request("http://localhost"),
        params(foreign.bumpingCase.id),
      );
      expect(crossUnion.status).toBe(404);

      const overlay = createOverlayUnion({
        name: "No Bumping Local",
        enabledModules: ["comms", "grievance"],
        localNumber: "999",
      });
      authMock.mockResolvedValue(
        session({
          unionId: overlay.union.id,
          localId: overlay.locals?.[0]?.id ?? "local-x",
          roles: ["local_president"],
        }),
      );
      const disabled = await listBumpingAttachments(
        new Request("http://localhost"),
        params("bump-001"),
      );
      expect(disabled.status).toBe(403);
      expect(await disabled.json()).toEqual({ error: "Module not enabled" });
    });
  });

  describe("GET /api/bumping/cases/[id]/attachments/[attachmentId]/download", () => {
    it("404s a sister-local president and returns bytes for the home local", async () => {
      const row = seedAttachment({
        id: "att-bump-dl",
        bumpingCaseId: "bump-001",
      });
      await getObjectStorage().put(row.storageKey, pdfBytes, row.mimeType);

      authMock.mockResolvedValue(
        session({
          id: "user-president-560",
          localId: "local-560",
          roles: ["local_president"],
        }),
      );
      const sister = await downloadBumpingAttachment(
        new Request("http://localhost"),
        params("bump-001", row.id),
      );
      expect(sister.status).toBe(404);

      authMock.mockResolvedValue(session());
      const res = await downloadBumpingAttachment(
        new Request("http://localhost"),
        params("bump-001", row.id),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(Buffer.from(await res.arrayBuffer())).toEqual(pdfBytes);
    });
  });
});
