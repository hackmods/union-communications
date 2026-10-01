import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: vi.fn(async () => {
    throw new Error("simulated Postgres outage");
  }),
}));
import {
  PENDING_TTL_MS,
  clearPendingSecret,
  getPendingSecret,
  resetMfaEnrollmentStoreForTests,
  resetMfaPendingProcessMemoryForTests,
  setPendingSecret,
  useSharedPendingEnrollmentStoreForTests,
} from "@/lib/auth/mfa-enrollment-store";

describe("mfa-enrollment-store pending secrets", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_USERS_BACKEND", "memory");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("UNIONOPS_HOSTED_CUSTOMER_MODE", "");
    resetMfaEnrollmentStoreForTests();
  });

  afterEach(() => {
    resetMfaEnrollmentStoreForTests();
    vi.unstubAllEnvs();
  });

  it("round-trips a pending secret until expiry", async () => {
    await setPendingSecret("user-a", "JBSWY3DPEHPK3PXP");
    expect(await getPendingSecret("user-a")).toBe("JBSWY3DPEHPK3PXP");
    await clearPendingSecret("user-a");
    expect(await getPendingSecret("user-a")).toBeNull();
  });

  it("ignores expired pending secrets", async () => {
    await setPendingSecret(
      "user-a",
      "JBSWY3DPEHPK3PXP",
      Date.now() - PENDING_TTL_MS - 5,
    );
    expect(await getPendingSecret("user-a")).toBeNull();
  });

  it("reads from the shared store after this process cache is cleared", async () => {
    useSharedPendingEnrollmentStoreForTests();
    await setPendingSecret("user-a", "JBSWY3DPEHPK3PXP");
    resetMfaPendingProcessMemoryForTests();
    expect(await getPendingSecret("user-a")).toBe("JBSWY3DPEHPK3PXP");
  });

  it("fails closed in hosted customer mode without Postgres", async () => {
    vi.stubEnv("UNIONOPS_HOSTED_CUSTOMER_MODE", "true");
    vi.stubEnv("AUTH_USERS_BACKEND", "memory");
    await expect(setPendingSecret("user-a", "JBSWY3DPEHPK3PXP")).rejects.toThrow(
      /durable PostgreSQL storage/i,
    );
    await expect(getPendingSecret("user-a")).rejects.toThrow(
      /durable PostgreSQL storage/i,
    );
  });

  it("does not acknowledge a pending secret that failed to persist", async () => {
    const env = {
      AUTH_USERS_BACKEND: "postgres",
      DATABASE_URL: "postgres://example.invalid/unionops",
      UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
      AUTH_TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    } as unknown as NodeJS.ProcessEnv;
    await expect(
      setPendingSecret("user-db-outage", "JBSWY3DPEHPK3PXP", Date.now(), env),
    ).rejects.toThrow("simulated Postgres outage");
    await expect(getPendingSecret("user-db-outage", Date.now(), env)).rejects.toThrow(
      "simulated Postgres outage",
    );
  });
});
