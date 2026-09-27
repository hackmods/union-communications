import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accessUpdate: vi.fn(),
  auditDbBackend: vi.fn(),
  auditLog: vi.fn(),
  auth: vi.fn(),
  canInviteAcrossUnionLocals: vi.fn(),
  canInviteRoles: vi.fn(),
  canManageInvites: vi.fn(),
  createInvite: vi.fn(),
  createUnionDurable: vi.fn(),
  findOrCreateLocal: vi.fn(),
  getTenantContext: vi.fn(),
  hydrateTenantOverlayFromPostgres: vi.fn(),
  isHostedCustomerMode: vi.fn(),
  resolveAuthorizationActor: vi.fn(),
  tenantsPostgresEnabled: vi.fn(),
  verifyFreshMfaStepUp: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/authorization/resolve-actor", () => ({ resolveAuthorizationActor: mocks.resolveAuthorizationActor }));
vi.mock("@/lib/tenant/access", () => ({
  canInviteAcrossUnionLocals: mocks.canInviteAcrossUnionLocals,
  canInviteRoles: mocks.canInviteRoles,
  canManageInvites: mocks.canManageInvites,
  inviteRolesForActor: vi.fn(() => ["local_steward"]),
}));
vi.mock("@/lib/tenant/local-number-access", () => ({ canElevateLocalNumber: vi.fn(() => true) }));
vi.mock("@/lib/tenant/loader", () => ({
  findLocalByNumber: vi.fn(),
  getTenantContext: mocks.getTenantContext,
  getAllTenantSeeds: vi.fn(() => []),
}));
vi.mock("@/lib/tenant/persist", () => ({
  findOrCreateLocal: mocks.findOrCreateLocal,
  hydrateTenantOverlayFromPostgres: mocks.hydrateTenantOverlayFromPostgres,
  createCollectionDurable: vi.fn(),
  createUnionDurable: mocks.createUnionDurable,
  tenantsPostgresEnabled: mocks.tenantsPostgresEnabled,
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/invites", () => ({
  createInvite: mocks.createInvite,
  listInvitesForUnion: vi.fn(),
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({ verifyFreshMfaStepUp: mocks.verifyFreshMfaStepUp }));
vi.mock("@/lib/auth/mfa-policy", () => ({ isHostedCustomerMode: mocks.isHostedCustomerMode }));
vi.mock("@/lib/db/backend", () => ({ auditDbBackend: mocks.auditDbBackend }));
vi.mock("@/lib/access-requests/store", () => ({ accessRequestStore: { update: mocks.accessUpdate } }));
vi.mock("@/lib/db/rls-context", () => ({ withRlsContext: (_ctx: unknown, run: () => unknown) => run() }));
vi.mock("@/lib/email/send", () => ({ sendTransactionalEmail: vi.fn() }));

import { POST } from "@/app/api/invites/route";

const session = { user: { id: "platform-1", roles: ["platform_admin"] } };
const seed = { union: { id: "union-new", name: "Private Union" }, locals: [{ id: "local-new", localNumber: "321" }] };
const invite = {
  id: "invite-1", email: "steward@example.test", name: "A Steward",
  expiresAt: "2026-10-01T00:00:00.000Z", token: "opaque-invite-token",
  unionId: "union-new", localId: "local-new", roles: ["local_steward"],
};

function request(body: Record<string, unknown> = {}) {
  return new Request("https://unionops.test/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "steward@example.test", name: "A Steward", roles: ["local_steward"],
      newUnionName: "Private Union", localNumber: "321", ...body,
    }),
  });
}

describe("POST /api/invites new union path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(session);
    mocks.resolveAuthorizationActor.mockResolvedValue({ accountActive: true, roles: ["platform_admin"] });
    mocks.canManageInvites.mockReturnValue(true);
    mocks.canInviteRoles.mockReturnValue(true);
    mocks.canInviteAcrossUnionLocals.mockReturnValue(true);
    mocks.isHostedCustomerMode.mockReturnValue(false);
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.tenantsPostgresEnabled.mockReturnValue(false);
    mocks.hydrateTenantOverlayFromPostgres.mockResolvedValue(undefined);
    mocks.auditLog.mockResolvedValue({});
    mocks.verifyFreshMfaStepUp.mockImplementation(({ code }: { code?: string }) => Promise.resolve(
      code
        ? { ok: true, required: true }
        : { ok: false, status: 428, code: "required", outcome: "denied" },
    ));
    mocks.createUnionDurable.mockResolvedValue(seed);
    mocks.getTenantContext.mockReturnValue({
      union: seed.union,
      locals: seed.locals,
      divisions: [],
      bargainingUnits: [],
    });
    mocks.findOrCreateLocal.mockResolvedValue({ local: seed.locals[0] });
    mocks.createInvite.mockResolvedValue(invite);
  });

  it("requires fresh MFA before union provisioning and returns private correlation headers", async () => {
    const response = await POST(request());

    expect(response.status).toBe(428);
    expect((await response.json()).code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "denied", requestId: response.headers.get("X-Request-ID"),
      metadata: { reason: "mfa_step_up_required" },
    }));
  });

  it("requires durable tenant and audit stores in hosted mode", async () => {
    mocks.isHostedCustomerMode.mockReturnValue(true);
    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("durable_storage_required");
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("audits the authorized attempt before creating the union and confirms the invitation after creation", async () => {
    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: "invite-1",
      unionId: "union-new",
      token: "opaque-invite-token",
    });
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenNthCalledWith(1, expect.objectContaining({
      resourceId: "provision-request", metadata: { phase: "provision_authorized" },
      requestId: response.headers.get("X-Request-ID"),
    }));
    expect(mocks.auditLog).toHaveBeenNthCalledWith(2, expect.objectContaining({
      resourceId: "union-new", unionId: "union-new", localId: "local-new",
      metadata: { phase: "provision_result", inviteCreated: "true" },
      requestId: response.headers.get("X-Request-ID"),
    }));
    expect(mocks.auditLog.mock.invocationCallOrder[0]).toBeLessThan(mocks.createUnionDurable.mock.invocationCallOrder[0]);
    expect(mocks.createUnionDurable.mock.invocationCallOrder[0]).toBeLessThan(mocks.createInvite.mock.invocationCallOrder[0]);
    expect(mocks.createInvite.mock.invocationCallOrder[0]).toBeLessThan(mocks.auditLog.mock.invocationCallOrder[1]);
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("Private Union");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("steward@example.test");
  });

  it("does not create a union if the authorization audit cannot be written", async () => {
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockRejectedValue(new Error("audit unavailable"));
    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });

  it("hides invite tokens and reports an uncertain result when final evidence fails", async () => {
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit unavailable"));
    const response = await POST(request({ mfaCode: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("union_result_unconfirmed");
    expect(body.token).toBeUndefined();
    expect(mocks.createInvite).toHaveBeenCalledOnce();
  });

  it("keeps ordinary invites outside the union creation step-up", async () => {
    const response = await POST(request({ newUnionName: undefined, unionId: "union-existing", localNumber: "321" }));

    expect(response.status).toBe(200);
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.createUnionDurable).not.toHaveBeenCalled();
  });
});
