import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizationActor } from "@/lib/authorization/model";
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authorization/resolve-actor", () => ({ resolveAuthorizationActor: vi.fn() }));
vi.mock("@/lib/auth/mfa-policy", () => ({ isMfaEnabled: (env: Record<string, string>) => env.AUTH_MFA_ENABLED === "true", resolveMfaMode: (env: Record<string, string>) => env.AUTH_MFA_MODE || null }));
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { customizationConfigurationError, requireCustomizationSession } from "@/lib/auth/customization-session";
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);
const target = { id: "other-union", kind: "union" as const, unionId: "union-beta", parentScopeId: "system", archived: false };
const rootActor: AuthorizationActor = { userId: "root", unionId: "union-alpha", roles: ["platform_admin"], memberships: [], assignments: [], delegations: [], circleMemberships: [], source: "database", accountActive: true, mfaVerified: true };
const production = { NODE_ENV: "production", CUSTOMIZATION_ENABLED: "true", DATABASE_URL: "postgres://isolated-test", AUTH_USERS_BACKEND: "postgres", AUTH_MFA_ENABLED: "true", AUTH_MFA_MODE: "totp" };
beforeEach(() => { vi.unstubAllEnvs(); for (const [key, value] of Object.entries(production)) vi.stubEnv(key, value); mockedAuth.mockResolvedValue({ user: { id: "root", roles: ["platform_admin"] } }); vi.mocked(resolveAuthorizationActor).mockResolvedValue(rootActor); });
describe("customization session boundary", () => {
  it.each([{ CUSTOMIZATION_ENABLED: "false" }, { DATABASE_URL: "" }, { AUTH_USERS_BACKEND: "memory" }, { AUTH_MFA_ENABLED: "false" }, { AUTH_MFA_MODE: "shared_code_insecure", AUTH_ALLOW_SHARED_MFA_IN_PROD: "true" }, { DATABASE_URL: "", CUSTOMIZATION_ALLOW_MEMORY_DEMO: "true" }])("fails closed for unsafe production configuration %j", (change) => {
    expect(customizationConfigurationError({ ...production, ...change })).not.toBeNull();
  });
  it("uses fresh account state instead of the session's stale Root role", async () => {
    vi.mocked(resolveAuthorizationActor).mockResolvedValue({ ...rootActor, roles: ["union_admin"] });
    expect((await requireCustomizationSession(target)).ok).toBe(false);
  });
  it("rejects an invalidated account/session version", async () => {
    vi.mocked(resolveAuthorizationActor).mockResolvedValue({ ...rootActor, accountActive: false });
    expect(await requireCustomizationSession(target)).toMatchObject({ ok: false, status: 401 });
  });
  it("returns only an explicit content target context for Root", async () => {
    expect(await requireCustomizationSession(target)).toMatchObject({ ok: true, rlsContext: { userId: "root", unionId: "union-beta", crossLocal: false, mfaVerified: true } });
  });
  it("rejects unauthenticated requests", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(await requireCustomizationSession(target)).toMatchObject({ ok: false, status: 401 });
  });
});
