import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AuthorizationActor } from "@/lib/authorization/model";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authorization/resolve-actor", () => ({ resolveAuthorizationActor: vi.fn() }));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isMfaEnabled: (env: Record<string, string>) => env.AUTH_MFA_ENABLED === "true",
  resolveMfaMode: (env: Record<string, string>) => env.AUTH_MFA_MODE || null,
}));
vi.mock("@/lib/customization/store", () => ({
  getCustomizationAdapter: vi.fn(() => {
    throw new Error("adapter should not run for denied callers");
  }),
}));

import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { POST as publishRoute } from "@/app/api/site-admin/customization/resources/[id]/publish/route";
import { POST as policyRoute } from "@/app/api/site-admin/customization/resources/[id]/policy/route";

const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);
const production = {
  NODE_ENV: "production",
  CUSTOMIZATION_ENABLED: "true",
  DATABASE_URL: "postgres://isolated-test",
  AUTH_USERS_BACKEND: "postgres",
  AUTH_MFA_ENABLED: "true",
  AUTH_MFA_MODE: "totp",
};

function actor(roles: AuthorizationActor["roles"]): AuthorizationActor {
  return {
    userId: "user-1",
    roles,
    memberships: [],
    assignments: [],
    delegations: [],
    circleMemberships: [],
    source: "database",
    accountActive: true,
    mfaVerified: true,
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/site-admin/customization/resources/resource-1/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const target = {
  id: "alpha",
  kind: "union" as const,
  unionId: "union-alpha",
  parentScopeId: "system",
  archived: false,
};

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(production)) vi.stubEnv(key, value);
});

describe("customization API role denial", () => {
  it.each([
    ["local_member"],
    ["local_steward"],
    ["local_exec"],
    ["union_admin"],
  ] as const)("denies publish to %s", async (role) => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1", roles: [role] } });
    vi.mocked(resolveAuthorizationActor).mockResolvedValue(actor([role]));
    const res = await publishRoute(request({
      target,
      resourceId: "resource-1",
      reason: "nope",
      idempotencyKey: "deny-publish-1",
      expectedDraftLockVersion: 1,
      expectedGeneration: 1,
      scopes: [{ id: "system", kind: "system", archived: false }, target],
    }), { params: Promise.resolve({ id: "resource-1" }) });
    expect(res.status).toBe(403);
  });

  it("denies policy withdrawal to union_admin", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1", roles: ["union_admin"] } });
    vi.mocked(resolveAuthorizationActor).mockResolvedValue(actor(["union_admin"]));
    const res = await policyRoute(request({
      target,
      resourceId: "resource-1",
      reason: "withdraw",
      expectedPolicyVersion: 1,
      withdrawn: true,
    }), { params: Promise.resolve({ id: "resource-1" }) });
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated publish", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await publishRoute(request({
      target,
      resourceId: "resource-1",
      reason: "nope",
      idempotencyKey: "deny-anon-1",
      expectedDraftLockVersion: 1,
      expectedGeneration: 1,
      scopes: [{ id: "system", kind: "system", archived: false }, target],
    }), { params: Promise.resolve({ id: "resource-1" }) });
    expect(res.status).toBe(401);
  });
});
