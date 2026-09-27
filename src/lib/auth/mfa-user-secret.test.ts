import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMfaEnrollmentStoreForTests } from "@/lib/auth/mfa-enrollment-store";
import { resetMfaTotpCountersForTests } from "@/lib/auth/mfa-totp-counters";
import {
  getTotpSecretForUser,
  persistTotpSecretForUser,
} from "@/lib/auth/mfa-user-secret";

describe("mfa-user-secret (demo roster path)", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_USERS_BACKEND", "memory");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("UNIONOPS_HOSTED_CUSTOMER_MODE", "");
  });

  afterEach(() => {
    resetMfaEnrollmentStoreForTests();
    resetMfaTotpCountersForTests();
    vi.unstubAllEnvs();
  });

  it("falls back to the demo roster's static secret", async () => {
    const secret = await getTotpSecretForUser("user-president-7");
    expect(secret).toBe("JBSWY3DPEHPK3PXP");
  });

  it("returns null for unknown users", async () => {
    const secret = await getTotpSecretForUser("user-does-not-exist");
    expect(secret).toBeNull();
  });

  it("prefers a confirmed override once enrolled", async () => {
    await persistTotpSecretForUser("user-president-7", "AAAABBBBCCCCDDDD", 1);
    const secret = await getTotpSecretForUser("user-president-7");
    expect(secret).toBe("AAAABBBBCCCCDDDD");
  });

  it("enrolls a solo user who previously had no secret", async () => {
    expect(await getTotpSecretForUser("user-solo")).toBeNull();
    await persistTotpSecretForUser("user-solo", "EEEEFFFFGGGGHHHH", 2);
    expect(await getTotpSecretForUser("user-solo")).toBe("EEEEFFFFGGGGHHHH");
  });
});
