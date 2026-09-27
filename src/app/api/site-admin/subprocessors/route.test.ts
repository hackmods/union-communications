import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSiteAdminSession: vi.fn(),
  isPostgresConfigured: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: mocks.isPostgresConfigured,
  getDb: mocks.getDb,
}));

import { GET } from "@/app/api/site-admin/subprocessors/route";
import { authorizeSubprocessorAdmin } from "@/lib/site-admin/subprocessor-http";

describe("site-admin subprocessor authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated and non-platform-admin requests before database access", async () => {
    mocks.requireSiteAdminSession.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const unauthenticated = await GET();
    expect(unauthenticated.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();

    mocks.requireSiteAdminSession.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    const nonAdmin = await GET();
    expect(nonAdmin.status).toBe(403);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("requires durable storage and passes only the authenticated MFA-backed actor to RLS", async () => {
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: { user: { id: "operator-1", roles: ["platform_admin"] } },
    });
    mocks.isPostgresConfigured.mockReturnValue(false);
    const unavailable = await authorizeSubprocessorAdmin();
    expect(unavailable.ok).toBe(false);
    if (!unavailable.ok) expect(unavailable.response.status).toBe(503);

    mocks.isPostgresConfigured.mockReturnValue(true);
    const access = await authorizeSubprocessorAdmin();
    expect(access).toEqual({
      ok: true,
      actorId: "operator-1",
      rlsContext: { userId: "operator-1", mfaVerified: true },
    });
  });
});
