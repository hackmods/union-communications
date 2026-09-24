import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/mfa-policy", () => ({
  sessionMfaOk: vi.fn(),
}));

vi.mock("@/lib/authorization/resolve-actor", () => ({
  resolveAuthorizationActor: vi.fn(),
}));

vi.mock("@/lib/tenant/persist", () => ({
  hydrateTenantOverlayFromPostgres: vi.fn(),
}));

vi.mock("@/lib/tenant/loader", () => ({
  getTenantContext: vi.fn(),
}));

import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { getTenantContext } from "@/lib/tenant/loader";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";

const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);
const mockedMfa = vi.mocked(sessionMfaOk);
const mockedActor = vi.mocked(resolveAuthorizationActor);
const mockedTenant = vi.mocked(getTenantContext);

function makeSession() {
  return {
    user: {
      id: "u-1",
      name: "Steward",
      unionId: "union-b7p",
      localId: "local-243",
      roles: ["steward"],
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

function makeActor() {
  return {
    userId: "u-1",
    unionId: "union-b7p",
    localId: "local-243",
    roles: ["steward"] as const,
    accountActive: true,
    source: "session" as const,
    assignments: [{ unionId: "union-b7p", localId: "local-243" }],
    delegations: [],
  };
}

describe("requireGrievanceSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTenant.mockReturnValue({
      union: { enabledModules: ["grievance"] },
    } as ReturnType<typeof getTenantContext>);
  });

  it("returns 401 when no session is present", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await requireGrievanceSession();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("allows durable-style access when MFA is off (sessionMfaOk true)", async () => {
    // Regression: production + postgres grievances must not 503 when MFA is unset.
    // sessionMfaOk returns true whenever AUTH_MFA_ENABLED is off.
    mockedAuth.mockResolvedValueOnce(makeSession());
    mockedMfa.mockReturnValueOnce(true);
    mockedActor.mockResolvedValueOnce(makeActor() as never);

    const result = await requireGrievanceSession();
    expect(result.ok).toBe(true);
    expect(mockedMfa).toHaveBeenCalledOnce();
  });

  it("returns 403 MFA required only when sessionMfaOk is false", async () => {
    mockedAuth.mockResolvedValueOnce(makeSession());
    mockedMfa.mockReturnValueOnce(false);

    const result = await requireGrievanceSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toBe("MFA required");
    }
    expect(mockedActor).not.toHaveBeenCalled();
  });
});
