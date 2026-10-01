import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSiteAdminSession, sessionMfaOk } = vi.hoisted(() => ({
  requireSiteAdminSession: vi.fn(),
  sessionMfaOk: vi.fn(),
}));

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession,
}));
vi.mock("@/lib/auth/mfa-policy", () => ({
  sessionMfaOk,
}));

import { authorizeOutreachListsAdmin } from "./outreach-lists-admin";

describe("authorizeOutreachListsAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets userId on the RLS context so customization_root can authorize Site Admin reads", async () => {
    requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-platform-admin" } },
    });
    sessionMfaOk.mockReturnValue(true);

    const result = await authorizeOutreachListsAdmin();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.access.rlsContext).toEqual({
      userId: "user-platform-admin",
      platformAdmin: true,
      mfaVerified: true,
    });
  });

  it("rejects when MFA is required and missing", async () => {
    requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-platform-admin" } },
    });
    sessionMfaOk.mockReturnValue(false);

    const result = await authorizeOutreachListsAdmin();
    expect(result.ok).toBe(false);
  });
});
