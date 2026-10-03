import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditDbBackend: vi.fn(),
  auditLog: vi.fn(),
  createCollectionDurable: vi.fn(),
  findOrCreateLocal: vi.fn(),
  getDb: vi.fn(),
  isHostedCustomerMode: vi.fn(),
  isPostgresConfigured: vi.fn(),
  requireSiteAdminSession: vi.fn(),
  reportApiFailure: vi.fn(),
  verifyFreshMfaStepUp: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: mocks.getDb,
  isPostgresConfigured: mocks.isPostgresConfigured,
}));
vi.mock("@/lib/db/backend", () => ({ auditDbBackend: mocks.auditDbBackend }));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isHostedCustomerMode: mocks.isHostedCustomerMode,
}));
vi.mock("@/lib/db/schema/tenant", () => ({ divisions: {} }));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.verifyFreshMfaStepUp,
}));
vi.mock("@/lib/tenant/persist", () => ({
  createCollectionDurable: mocks.createCollectionDurable,
  findOrCreateLocal: mocks.findOrCreateLocal,
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { POST } from "@/app/api/site-admin/locals/route";

const actor = { user: { id: "operator-1", roles: ["platform_admin"] } };
const local = {
  id: "local-1",
  unionId: "union-1",
  localNumber: "123",
  subText: "",
};

function request(body: Record<string, unknown> = {}) {
  return new Request("https://unionops.test/api/site-admin/locals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unionId: "union-1", localNumber: "123", ...body }),
  });
}

describe("POST /api/site-admin/locals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({ ok: true, session: actor });
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.auditLog.mockResolvedValue({});
    mocks.findOrCreateLocal.mockResolvedValue({ local, created: true });
    mocks.createCollectionDurable.mockResolvedValue({ id: "collection-1" });
    mocks.verifyFreshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("requires fresh MFA before provisioning", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.findOrCreateLocal).not.toHaveBeenCalled();
    expect(mocks.createCollectionDurable).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_admin.local.provision",
        outcome: "denied",
        metadata: { reason: "mfa_step_up_required" },
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
  });

  it("rejects unexpected fields before verifying MFA", async () => {
    const response = await POST(request({ hidden: "ignored" }));

    expect(response.status).toBe(400);
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.findOrCreateLocal).not.toHaveBeenCalled();
  });

  it("requires durable audit storage for hosted provisioning", async () => {
    mocks.isHostedCustomerMode.mockReturnValue(true);
    mocks.auditDbBackend.mockReturnValue("memory");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("durable_storage_required");
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.findOrCreateLocal).not.toHaveBeenCalled();
  });

  it("requires an authorization audit before writes and records a correlated result without the code", async () => {
    const response = await POST(
      request({ collectionCode: "A", collectionName: "Unit", mfaCode: "123456" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ created: true, collectionId: "collection-1" });
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "site_admin.local.provision",
        metadata: { phase: "provision_authorized" },
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: "site_admin.local.create",
        metadata: { phase: "provision_result", created: "true", collectionCreated: "true", mfaRequired: "false" },
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
    expect(mocks.auditLog.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.findOrCreateLocal.mock.invocationCallOrder[0],
    );
    expect(mocks.findOrCreateLocal.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.auditLog.mock.invocationCallOrder[1],
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });

  it("does not mutate when the authorization audit is unavailable", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.findOrCreateLocal).not.toHaveBeenCalled();
  });

  it("reports an uncertain result if post-write evidence cannot be confirmed", async () => {
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("local_result_unconfirmed");
    expect(mocks.findOrCreateLocal).toHaveBeenCalledOnce();
  });
});
