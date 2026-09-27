import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditDbBackend: vi.fn(),
  auditLog: vi.fn(),
  createUnionDurable: vi.fn(),
  hydrateTenantOverlayFromPostgres: vi.fn(),
  isHostedCustomerMode: vi.fn(),
  isPostgresConfigured: vi.fn(),
  isTrustedUnionPresetId: vi.fn(),
  requireSiteAdminSession: vi.fn(),
  reportApiFailure: vi.fn(),
  setUnionCommsPresetId: vi.fn(),
  verifyFreshMfaStepUp: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ isPostgresConfigured: mocks.isPostgresConfigured }));
vi.mock("@/lib/db/backend", () => ({ auditDbBackend: mocks.auditDbBackend }));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isHostedCustomerMode: mocks.isHostedCustomerMode,
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.verifyFreshMfaStepUp,
}));
vi.mock("@/lib/tenant/persist", () => ({
  createUnionDurable: mocks.createUnionDurable,
  hydrateTenantOverlayFromPostgres: mocks.hydrateTenantOverlayFromPostgres,
  setUnionCommsPresetId: mocks.setUnionCommsPresetId,
}));
vi.mock("@/lib/brand/union-preset-bridge", () => ({
  isTrustedUnionPresetId: mocks.isTrustedUnionPresetId,
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { POST } from "@/app/api/site-admin/unions/route";

const actor = { user: { id: "operator-1", roles: ["platform_admin"] } };
const seed = {
  union: { id: "union-1", name: "Example Union", slug: "example-union" },
  locals: [{ id: "local-1", localNumber: "123" }],
};

function request(body: Record<string, unknown> = {}) {
  return new Request("https://unionops.test/api/site-admin/unions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Example Union", ...body }),
  });
}

describe("POST /api/site-admin/unions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({ ok: true, session: actor });
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.isTrustedUnionPresetId.mockReturnValue(true);
    mocks.auditLog.mockResolvedValue({});
    mocks.createUnionDurable.mockResolvedValue(seed);
    mocks.hydrateTenantOverlayFromPostgres.mockResolvedValue(undefined);
    mocks.setUnionCommsPresetId.mockResolvedValue(undefined);
    mocks.verifyFreshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("requires fresh MFA before creating a union or its first local", async () => {
    const response = await POST(request({ localNumber: "123" }));

    expect(response.status).toBe(428);
    expect((await response.json()).code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_admin.union.provision",
        outcome: "denied",
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("rejects unexpected request fields before MFA verification", async () => {
    const response = await POST(request({ hidden: true }));

    expect(response.status).toBe(400);
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("requires durable audit storage for hosted provisioning", async () => {
    mocks.isHostedCustomerMode.mockReturnValue(true);
    mocks.auditDbBackend.mockReturnValue("memory");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("durable_storage_required");
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("requires correlated authorization evidence before provisioning and redacts input details", async () => {
    const response = await POST(request({ localNumber: "123", mfaCode: "123456" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ union: { id: "union-1" }, local: { id: "local-1" } });
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "site_admin.union.provision",
        resourceId: "provision-request",
        metadata: { phase: "provision_authorized" },
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: "site_admin.union.create",
        resourceId: "union-1",
        unionId: "union-1",
        localId: "local-1",
        metadata: { phase: "provision_result", firstLocalCreated: "true", commsPresetApplied: "false" },
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
    expect(mocks.auditLog.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createUnionDurable.mock.invocationCallOrder[0],
    );
    expect(mocks.createUnionDurable.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.auditLog.mock.invocationCallOrder[1],
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("Example Union");
  });

  it("does not create a union when the authorization audit is unavailable", async () => {
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("reports an uncertain result if post-write evidence fails", async () => {
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("union_result_unconfirmed");
    expect(mocks.createUnionDurable).toHaveBeenCalledOnce();
  });
});
