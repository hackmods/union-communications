import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/mfa-policy", () => ({
  sessionMfaOk: vi.fn(),
}));

import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";

// `auth` is overloaded by NextAuth; for unit-test purposes we cast to a
// a function that resolves to whatever we configure for the session.
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);
const mockedMfa = vi.mocked(sessionMfaOk);

function makeSession(roles: string[]) {
  return {
    user: {
      id: "ua-1",
      name: "Operator",
      unionId: "union-b7p",
      roles,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe("requireSiteAdminSession", () => {
  it("returns 401 when no session is present", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await requireSiteAdminSession();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("returns 403 when MFA is not satisfied (even for platform_admin)", async () => {
    mockedAuth.mockResolvedValueOnce(makeSession(["platform_admin"]));
    mockedMfa.mockReturnValueOnce(false);
    const result = await requireSiteAdminSession();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("returns 403 for non-platform_admin roles, even if MFA is verified", async () => {
    mockedAuth.mockResolvedValueOnce(
      makeSession(["union_admin", "local_president"]),
    );
    mockedMfa.mockReturnValueOnce(true);
    const result = await requireSiteAdminSession();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("returns ok for platform_admin + MFA", async () => {
    mockedAuth.mockResolvedValueOnce(makeSession(["platform_admin"]));
    mockedMfa.mockReturnValueOnce(true);
    const result = await requireSiteAdminSession();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.user.id).toBe("ua-1");
      expect(result.session.user.roles).toContain("platform_admin");
    }
  });
});
