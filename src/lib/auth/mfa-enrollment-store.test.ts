import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
});
