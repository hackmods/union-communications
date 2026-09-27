import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attachmentsDbBackend: vi.fn(),
  auditDbBackend: vi.fn(),
  auditLog: vi.fn(),
  canCrossLocalGrievance: vi.fn(),
  documentGetById: vi.fn(),
  documentReadBytes: vi.fn(),
  isDownloadAllowed: vi.fn(),
  isHostedCustomerMode: vi.fn(),
  requireGrievanceSession: vi.fn(),
  verifyFreshMfaStepUp: vi.fn(),
}));

vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/grievance-session", () => ({ requireGrievanceSession: mocks.requireGrievanceSession }));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({ verifyFreshMfaStepUp: mocks.verifyFreshMfaStepUp }));
vi.mock("@/lib/auth/mfa-policy", () => ({ isHostedCustomerMode: mocks.isHostedCustomerMode }));
vi.mock("@/lib/db/backend", () => ({
  attachmentsDbBackend: mocks.attachmentsDbBackend,
  auditDbBackend: mocks.auditDbBackend,
}));
vi.mock("@/lib/authorization/legacy-role-compat", () => ({ canCrossLocalGrievance: mocks.canCrossLocalGrievance }));
vi.mock("@/lib/attachments/scan", () => ({ isDownloadAllowed: mocks.isDownloadAllowed }));
vi.mock("@/lib/documents/store", () => ({
  documentStore: { getById: mocks.documentGetById, readBytes: mocks.documentReadBytes },
}));

import { GET, POST } from "@/app/api/documents/[id]/download/route";

const session = { user: { id: "steward-1", unionId: "union-a", localId: "local-a", roles: ["local_steward"] } };
const doc = {
  id: "doc-1", unionId: "union-a", localId: "local-a", scanStatus: "clean",
  storageKey: "opaque-key", mimeType: "application/pdf", fileName: "minutes.pdf",
};
const params = () => ({ params: Promise.resolve({ id: "doc-1" }) });
const request = (body: Record<string, unknown> = {}) => new Request(
  "https://unionops.test/api/documents/doc-1/download",
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
);

describe("POST /api/documents/[id]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireGrievanceSession.mockResolvedValue({ ok: true, session });
    mocks.canCrossLocalGrievance.mockReturnValue(true);
    mocks.isDownloadAllowed.mockReturnValue(true);
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.attachmentsDbBackend.mockReturnValue("memory");
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.documentGetById.mockResolvedValue(doc);
    mocks.documentReadBytes.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    mocks.auditLog.mockResolvedValue({});
    mocks.verifyFreshMfaStepUp.mockImplementation(({ code }: { code?: string }) => Promise.resolve(
      code
        ? { ok: true, required: true }
        : { ok: false, status: 428, code: "required", outcome: "denied" },
    ));
  });

  it("retires the legacy direct GET URL", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(mocks.documentGetById).not.toHaveBeenCalled();
  });

  it("requires a fresh MFA challenge before reading bytes", async () => {
    const response = await POST(request(), params());

    expect(response.status).toBe(428);
    expect((await response.json()).code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.documentReadBytes).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "denied", metadata: { reason: "mfa_step_up_required" },
    }));
  });

  it("checks scope before MFA and never reads another union's document", async () => {
    mocks.documentGetById.mockResolvedValue({ ...doc, unionId: "union-b" });

    const response = await POST(request({ mfaCode: "123456" }), params());

    expect(response.status).toBe(404);
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.documentReadBytes).not.toHaveBeenCalled();
  });

  it("fails closed in hosted mode without durable audit and document metadata", async () => {
    mocks.isHostedCustomerMode.mockReturnValue(true);
    mocks.attachmentsDbBackend.mockReturnValue("memory");

    const response = await POST(request({ mfaCode: "123456" }), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("durable_storage_required");
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.documentReadBytes).not.toHaveBeenCalled();
  });

  it("requires authorization audit before reading and result audit before returning bytes", async () => {
    const response = await POST(request({ mfaCode: "123456" }), params());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([37, 80, 68, 70]);
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenNthCalledWith(1, expect.objectContaining({
      action: "document.download", outcome: "success", metadata: { phase: "download_authorized" },
    }));
    expect(mocks.auditLog).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: "document.download", outcome: "success", metadata: { phase: "download_delivered" },
    }));
    expect(mocks.auditLog.mock.invocationCallOrder[0]).toBeLessThan(mocks.documentReadBytes.mock.invocationCallOrder[0]);
    expect(mocks.documentReadBytes.mock.invocationCallOrder[0]).toBeLessThan(mocks.auditLog.mock.invocationCallOrder[1]);
  });

  it("withholds bytes when authorization or result audit fails", async () => {
    mocks.auditLog.mockRejectedValueOnce(new Error("audit unavailable"));
    const response = await POST(request({ mfaCode: "123456" }), params());
    expect(response.status).toBe(503);
    expect(mocks.documentReadBytes).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mocks.requireGrievanceSession.mockResolvedValue({ ok: true, session });
    mocks.canCrossLocalGrievance.mockReturnValue(true);
    mocks.isDownloadAllowed.mockReturnValue(true);
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.documentGetById.mockResolvedValue(doc);
    mocks.documentReadBytes.mockResolvedValue(new Uint8Array([1]));
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit unavailable"));

    const uncertain = await POST(request({ mfaCode: "123456" }), params());
    expect(uncertain.status).toBe(503);
    expect((await uncertain.json()).code).toBe("download_audit_unavailable");
    expect(mocks.documentReadBytes).toHaveBeenCalledOnce();
  });
});
