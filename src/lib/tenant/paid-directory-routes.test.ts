import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  mfa: vi.fn(),
  postgres: vi.fn(),
  entitled: vi.fn(),
  list: vi.fn(),
  set: vi.fn(),
  siteAdmin: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/mfa-policy", () => ({ sessionMfaOk: mocks.mfa }));
vi.mock("@/lib/authorization/resolve-actor", () => ({
  resolveAuthorizationActor: async (session: { user: { id: string; unionId?: string; roles?: string[] } }) => ({
    userId: session.user.id,
    unionId: session.user.unionId,
    roles: session.user.roles ?? [],
    accountActive: true,
  }),
}));
vi.mock("@/lib/db/client", () => ({ isPostgresConfigured: mocks.postgres }));
vi.mock("@/lib/tenant/paid-directory", () => ({
  hasPaidTenantDirectory: mocks.entitled,
  listPaidTenantDirectory: mocks.list,
  setPaidTenantDirectory: mocks.set,
}));
vi.mock("@/lib/auth/site-admin-session", () => ({ requireSiteAdminSession: mocks.siteAdmin }));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.audit } }));

import { GET } from "@/app/api/union-directory/route";
import { PATCH } from "@/app/api/site-admin/union-directory-entitlement/route";

const unionAdmin = {
  user: { id: "admin-a", unionId: "union-a", roles: ["union_admin"] },
};

describe("paid union directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(unionAdmin);
    mocks.mfa.mockReturnValue(true);
    mocks.postgres.mockReturnValue(true);
    mocks.entitled.mockResolvedValue(false);
    mocks.list.mockResolvedValue([{ id: "local-a", localNumber: "243", divisionId: null }]);
    mocks.set.mockResolvedValue(true);
    mocks.audit.mockResolvedValue(undefined);
    mocks.siteAdmin.mockResolvedValue({ ok: true, session: { user: { id: "operator" } } });
  });

  it("denies anonymous, non-admin, wrong-union, and MFA-incomplete accounts before storage", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
    mocks.auth.mockResolvedValueOnce({ user: { id: "member", unionId: "union-a", roles: ["local_member"] } });
    expect((await GET()).status).toBe(403);
    mocks.auth.mockResolvedValueOnce({ user: { id: "admin", roles: ["union_admin"] } });
    expect((await GET()).status).toBe(403);
    mocks.mfa.mockReturnValueOnce(false);
    expect((await GET()).status).toBe(403);
    expect(mocks.entitled).not.toHaveBeenCalled();
  });

  it("fails closed without Postgres or an explicit paid entitlement", async () => {
    mocks.postgres.mockReturnValueOnce(false);
    expect((await GET()).status).toBe(503);
    expect((await GET()).status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("returns only union-scoped local metadata after the grant", async () => {
    mocks.entitled.mockResolvedValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      unionId: "union-a",
      locals: [{ id: "local-a", localNumber: "243", divisionId: null }],
    });
    expect(mocks.entitled).toHaveBeenCalledWith("union-a");
    expect(mocks.list).toHaveBeenCalledWith("union-a", "admin-a");
  });

  it("lets only site admin set a durable paid grant and audits it", async () => {
    mocks.siteAdmin.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    const request = () => new Request("http://localhost/api/site-admin/union-directory-entitlement", {
      method: "PATCH",
      body: JSON.stringify({ unionId: "union-a", enabled: true }),
    });
    expect((await PATCH(request())).status).toBe(403);
    expect(mocks.set).not.toHaveBeenCalled();

    const response = await PATCH(request());
    expect(response.status).toBe(200);
    expect(mocks.set).toHaveBeenCalledWith("union-a", true);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "site_admin.union_directory_entitlement.update",
      resourceId: "union-a",
      metadata: { enabled: "true" },
    }));
  });
});
