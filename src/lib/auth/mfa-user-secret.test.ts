import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMfaEnrollmentStoreForTests } from "@/lib/auth/mfa-enrollment-store";
import {
  countUnusedMfaRecoveryCodes,
  invalidateAllMfaRecoveryCodes,
  resetMfaRecoveryCodesForTests,
  rotateMfaRecoveryCodes,
} from "@/lib/auth/mfa-recovery-codes";
import { resetMfaTotpCountersForTests } from "@/lib/auth/mfa-totp-counters";
import {
  clearTotpEnrollmentForUser,
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
    resetMfaRecoveryCodesForTests();
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

  it("clears enrollment, recovery codes, and demo-roster secret fallback", async () => {
    const env = { AUTH_USERS_BACKEND: "memory" } as unknown as NodeJS.ProcessEnv;
    await persistTotpSecretForUser("user-solo", "EEEEFFFFGGGGHHHH", 2);
    await rotateMfaRecoveryCodes("user-solo", env);
    expect(await countUnusedMfaRecoveryCodes("user-solo", env)).toBe(10);

    await clearTotpEnrollmentForUser("user-solo", env);
    expect(await getTotpSecretForUser("user-solo")).toBeNull();
    expect(await countUnusedMfaRecoveryCodes("user-solo", env)).toBe(0);

    await clearTotpEnrollmentForUser("user-president-7", env);
    expect(await getTotpSecretForUser("user-president-7")).toBeNull();
  });
});

describe("invalidateAllMfaRecoveryCodes", () => {
  beforeEach(() => resetMfaRecoveryCodesForTests());

  it("marks every unused code used", async () => {
    const env = { AUTH_USERS_BACKEND: "memory" } as unknown as NodeJS.ProcessEnv;
    await rotateMfaRecoveryCodes("user-a", env);
    expect(await invalidateAllMfaRecoveryCodes("user-a", env)).toBe(10);
    expect(await countUnusedMfaRecoveryCodes("user-a", env)).toBe(0);
  });
});
