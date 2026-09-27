import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attachmentsDbBackend: vi.fn(),
  auditDbBackend: vi.fn(),
  auditLog: vi.fn(),
  canCrossLocalGrievance: vi.fn(),
  canDeleteSharedContent: vi.fn(),
  documentGetById: vi.fn(),
  documentRemove: vi.fn(),
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
vi.mock("@/lib/qol/access", () => ({ canDeleteSharedContent: mocks.canDeleteSharedContent }));
vi.mock("@/lib/documents/store", () => ({
  documentStore: { getById: mocks.documentGetById, remove: mocks.documentRemove },
}));

import { DELETE } from "@/app/api/documents/[id]/route";

const session = { user: { id: "steward-1", unionId: "union-a", localId: "local-a", roles: ["local_steward"] } };
const doc = {
  id: "doc-1", unionId: "union-a", localId: "local-a", uploadedById: "steward-2",
};
const params = () => ({ params: Promise.resolve({ id: "doc-1" }) });
const request = (body: Record<string, unknown> = {}) => new Request(
  "https://unionops.test/api/documents/doc-1",
  { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
);

describe("DELETE /api/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireGrievanceSession.mockResolvedValue({ ok: true, session });
    mocks.canCrossLocalGrievance.mockReturnValue(true);
    mocks.canDeleteSharedContent.mockReturnValue(true);
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.attachmentsDbBackend.mockReturnValue("memory");
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.documentGetById.mockResolvedValue(doc);
    mocks.documentRemove.mockResolvedValue(undefined);
    mocks.auditLog.mockResolvedValue({});
    mocks.verifyFreshMfaStepUp.mockImplementation(({ code }: { code?: string }) => Promise.resolve(
      code
        ? { ok: true, required: true }
        : { ok: false, status: 428, code: "required", outcome: "denied" },
    ));
  });

  it("requires fresh MFA after ownership and tenant authorization", async () => {
    const response = await DELETE(request(), params());

    expect(response.status).toBe(428);
    expect((await response.json()).code).toBe("mfa_step_up_required");
    expect(mocks.documentRemove).not.toHaveBeenCalled();
    expect(mocks.verifyFreshMfaStepUp).toHaveBeenCalledOnce();
  });

  it("rejects another union before checking MFA", async () => {
    mocks.documentGetById.mockResolvedValue({ ...doc, unionId: "union-b" });

    const response = await DELETE(request({ mfaCode: "123456" }), params());

    expect(response.status).toBe(404);
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.documentRemove).not.toHaveBeenCalled();
  });

  it("requires durable hosted file metadata and audit stores", async () => {
    mocks.isHostedCustomerMode.mockReturnValue(true);
    mocks.attachmentsDbBackend.mockReturnValue("memory");

    const response = await DELETE(request(), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("durable_storage_required");
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.documentRemove).not.toHaveBeenCalled();
  });

  it("requires confirmed authorization audit before delete and records its result", async () => {
    const response = await DELETE(request({ mfaCode: "123456" }), params());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenNthCalledWith(1, expect.objectContaining({
      action: "document.delete", outcome: "success", metadata: { phase: "delete_authorized" },
    }));
    expect(mocks.auditLog).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: "document.delete", outcome: "success", metadata: { phase: "delete_result" },
    }));
    expect(mocks.auditLog.mock.invocationCallOrder[0]).toBeLessThan(mocks.documentRemove.mock.invocationCallOrder[0]);
    expect(mocks.documentRemove.mock.invocationCallOrder[0]).toBeLessThan(mocks.auditLog.mock.invocationCallOrder[1]);
  });

  it("does not delete if intent audit fails and marks post-delete audit failure as uncertain", async () => {
    mocks.auditLog.mockRejectedValueOnce(new Error("audit unavailable"));
    const blocked = await DELETE(request({ mfaCode: "123456" }), params());
    expect(blocked.status).toBe(503);
    expect(mocks.documentRemove).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mocks.requireGrievanceSession.mockResolvedValue({ ok: true, session });
    mocks.canCrossLocalGrievance.mockReturnValue(true);
    mocks.canDeleteSharedContent.mockReturnValue(true);
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.documentGetById.mockResolvedValue(doc);
    mocks.documentRemove.mockResolvedValue(undefined);
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit unavailable"));

    const uncertain = await DELETE(request({ mfaCode: "123456" }), params());
    expect(uncertain.status).toBe(503);
    expect((await uncertain.json()).code).toBe("document_delete_unconfirmed");
    expect(mocks.documentRemove).toHaveBeenCalledOnce();
  });

  it("keeps document contents and security codes out of the audit entry", async () => {
    await DELETE(request({ mfaCode: "123456" }), params());

    const auditText = JSON.stringify(mocks.auditLog.mock.calls);
    expect(auditText).not.toContain("123456");
    expect(auditText).not.toContain("steward-2");
  });
});
