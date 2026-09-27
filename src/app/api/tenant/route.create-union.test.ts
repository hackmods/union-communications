import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditDbBackend: vi.fn(),
  auditLog: vi.fn(),
  auth: vi.fn(),
  createUnionDurable: vi.fn(),
  freshMfaStepUp: vi.fn(),
  hydrateTenantOverlayFromPostgres: vi.fn(),
  isHostedCustomerMode: vi.fn(),
  requireTenantOnboardingSession: vi.fn(),
  resolveAuthorizationActor: vi.fn(),
  sessionCanCreateUnion: vi.fn(),
  tenantsPostgresEnabled: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/tenant-session", () => ({
  requireTenantOnboardingSession: mocks.requireTenantOnboardingSession,
  sessionCanCreateUnion: mocks.sessionCanCreateUnion,
}));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isHostedCustomerMode: mocks.isHostedCustomerMode,
  sessionMfaOk: vi.fn(() => true),
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/authorization/resolve-actor", () => ({
  resolveAuthorizationActor: mocks.resolveAuthorizationActor,
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/db/backend", () => ({
  auditDbBackend: mocks.auditDbBackend,
  dataDbBackend: vi.fn(() => "postgres"),
}));
vi.mock("@/lib/tenant/persist", () => ({
  createCollectionDurable: vi.fn(),
  createDivisionDurable: vi.fn(),
  createLocalDurable: vi.fn(),
  createUnionDurable: mocks.createUnionDurable,
  hydrateTenantOverlayFromPostgres: mocks.hydrateTenantOverlayFromPostgres,
  setUnionDataModule: vi.fn(),
  setUnionEnabledModules: vi.fn(),
  tenantsPostgresEnabled: mocks.tenantsPostgresEnabled,
}));

import { POST } from "@/app/api/tenant/route";

const session = { user: { id: "operator-1", roles: ["platform_admin"] } };
const seed = {
  union: { id: "union-1", name: "Example Union", slug: "example-union" },
  locals: [{ id: "local-1", localNumber: "123" }],
};

function request(body: Record<string, unknown> = {}) {
  return new Request("https://unionops.test/api/tenant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_union", name: "Example Union", ...body }),
  });
}

describe("POST /api/tenant create_union", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTenantOnboardingSession.mockResolvedValue({ ok: true, session });
    mocks.sessionCanCreateUnion.mockReturnValue(true);
    mocks.resolveAuthorizationActor.mockResolvedValue({
      accountActive: true,
      roles: ["platform_admin"],
      unionId: undefined,
      memberships: [],
    });
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.tenantsPostgresEnabled.mockReturnValue(false);
    mocks.hydrateTenantOverlayFromPostgres.mockResolvedValue(undefined);
    mocks.auditLog.mockResolvedValue({});
    mocks.createUnionDurable.mockResolvedValue(seed);
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("requires a fresh challenge before union creation", async () => {
    const response = await POST(request({ localNumber: "123" }));

    expect(response.status).toBe(428);
    expect((await response.json()).code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tenant.union.provision",
        outcome: "denied",
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("rejects unknown fields before MFA verification", async () => {
    const response = await POST(request({ hidden: true }));

    expect(response.status).toBe(400);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("requires durable tenant and audit stores in hosted customer mode", async () => {
    mocks.isHostedCustomerMode.mockReturnValue(true);
    mocks.tenantsPostgresEnabled.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("durable_storage_required");
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("audits authorization before creation and omits the MFA code and union name", async () => {
    const response = await POST(request({ localNumber: "123", mfaCode: "123456" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ seed });
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "tenant.union.provision",
        resourceId: "provision-request",
        metadata: { phase: "provision_authorized" },
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: "tenant.union.provision",
        resourceId: "union-1",
        unionId: "union-1",
        localId: "local-1",
        metadata: { phase: "provision_result", firstLocalCreated: "true" },
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

  it("blocks in hosted customer mode when the audit store is not durable", async () => {
    mocks.isHostedCustomerMode.mockReturnValue(true);
    mocks.tenantsPostgresEnabled.mockReturnValue(true);
    mocks.auditDbBackend.mockReturnValue("memory");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("durable_storage_required");
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("reports an uncertain result if post-write audit confirmation fails", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit unavailable"));

    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("union_result_unconfirmed");
    expect(mocks.createUnionDurable).toHaveBeenCalledOnce();
  });
});
