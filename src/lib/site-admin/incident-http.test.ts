import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSiteAdminSession: vi.fn(),
  isPostgresConfigured: vi.fn(),
  resolveMfaMode: vi.fn(),
}));

vi.mock("@/lib/auth/site-admin-session", () => ({ requireSiteAdminSession: mocks.requireSiteAdminSession }));
vi.mock("@/lib/db/client", () => ({ isPostgresConfigured: mocks.isPostgresConfigured, getDb: vi.fn() }));
vi.mock("@/lib/auth/mfa-policy", () => ({
  resolveMfaMode: mocks.resolveMfaMode,
  verifyMfaCode: vi.fn(),
}));

import { authorizeIncidentAdmin } from "@/lib/site-admin/incident-http";

describe("incident register authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_USERS_BACKEND", "postgres");
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: { user: { id: "operator-1", roles: ["platform_admin"] } },
    });
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.resolveMfaMode.mockReturnValue("totp");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects the route before storage when site-admin authentication fails", async () => {
    mocks.requireSiteAdminSession.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    const result = await authorizeIncidentAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
    expect(mocks.isPostgresConfigured).not.toHaveBeenCalled();
  });

  it("requires durable accounts, durable database storage, and TOTP mode", async () => {
    mocks.isPostgresConfigured.mockReturnValueOnce(false);
    let result = await authorizeIncidentAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);

    vi.stubEnv("AUTH_USERS_BACKEND", "demo");
    result = await authorizeIncidentAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);

    vi.stubEnv("AUTH_USERS_BACKEND", "postgres");
    mocks.resolveMfaMode.mockReturnValueOnce("shared_code_insecure");
    result = await authorizeIncidentAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it("returns only the signed-in platform operator as the MFA-aware RLS actor", async () => {
    const result = await authorizeIncidentAdmin();
    expect(result).toEqual({
      ok: true,
      access: { actorId: "operator-1", rlsContext: { userId: "operator-1", mfaVerified: true } },
    });
  });
});
