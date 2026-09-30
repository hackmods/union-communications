import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));
const deleteWhere = vi.fn();
const del = vi.fn(() => ({ where: deleteWhere }));

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({ update, delete: del }),
  isPostgresConfigured: () => true,
}));

vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: async (_ctx: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/lib/auth/mfa-requirements", () => ({
  hostedCustomerProfileEnabled: () => false,
}));

describe("clearTotpCounterForUser (Postgres)", () => {
  beforeEach(() => {
    vi.resetModules();
    update.mockClear();
    updateSet.mockClear();
    updateWhere.mockClear();
    del.mockClear();
    deleteWhere.mockClear();
    vi.stubEnv("AUTH_USERS_BACKEND", "postgres");
    vi.stubEnv("DATABASE_URL", "postgres://unionops/test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resets last_counter with UPDATE and never DELETEs (0071 revoke)", async () => {
    const { clearTotpCounterForUser } = await import(
      "@/lib/auth/mfa-totp-counters"
    );
    await clearTotpCounterForUser("user-platform-admin", {
      AUTH_USERS_BACKEND: "postgres",
      DATABASE_URL: "postgres://unionops/test",
    } as NodeJS.ProcessEnv);

    expect(update).toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith({ lastCounter: 0 });
    expect(del).not.toHaveBeenCalled();
  });
});
