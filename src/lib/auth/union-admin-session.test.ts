import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), mfa: vi.fn(), actor: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/mfa-policy", () => ({ sessionMfaOk: mocks.mfa }));
vi.mock("@/lib/authorization/resolve-actor", () => ({ resolveAuthorizationActor: mocks.actor }));

import { requireUnionAdminSession } from "@/lib/auth/union-admin-session";

describe("union admin session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-a", unionId: "union-a", roles: ["union_admin"] } });
    mocks.mfa.mockReturnValue(true);
    mocks.actor.mockResolvedValue({ userId: "admin-a", unionId: "union-a", roles: ["union_admin"], accountActive: true });
  });

  it("requires login and MFA", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect(await requireUnionAdminSession()).toMatchObject({ ok: false, status: 401 });
    mocks.mfa.mockReturnValueOnce(false);
    expect(await requireUnionAdminSession()).toMatchObject({ ok: false, status: 403 });
  });

  it("denies inactive, other-union, and non-admin actors", async () => {
    mocks.actor.mockResolvedValueOnce({ userId: "admin-a", unionId: "union-a", roles: ["union_admin"], accountActive: false });
    expect(await requireUnionAdminSession()).toMatchObject({ ok: false, status: 403 });
    mocks.actor.mockResolvedValueOnce({ userId: "admin-a", unionId: "union-b", roles: ["union_admin"], accountActive: true });
    expect(await requireUnionAdminSession()).toMatchObject({ ok: false, status: 403 });
    mocks.actor.mockResolvedValueOnce({ userId: "admin-a", unionId: "union-a", roles: ["local_president"], accountActive: true });
    expect(await requireUnionAdminSession()).toMatchObject({ ok: false, status: 403 });
  });

  it("returns the actor's own union", async () => {
    expect(await requireUnionAdminSession()).toEqual({ ok: true, userId: "admin-a", unionId: "union-a" });
  });
});
