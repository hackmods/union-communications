import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearMfaGrants,
  issueMfaGrant,
} from "@/lib/auth/mfa-grants";
import {
  consumeTotpCounterForUser,
  resetMfaTotpCountersForTests,
  setTotpCounterForNewSecret,
} from "@/lib/auth/mfa-totp-counters";
import {
  resetMfaRecoveryCodesForTests,
  rotateMfaRecoveryCodes,
} from "@/lib/auth/mfa-recovery-codes";
import {
  noteMfaDurableFallback,
  resetMfaDurableFallbackSignalForTests,
  mfaDurableFallbackRecently,
} from "@/lib/auth/mfa-durable-fallback-signal";
import { verifyMfaCode } from "@/lib/auth/mfa-policy";
import { generateTotp } from "@/lib/auth/totp";
import {
  clearConfirmedSecretOverride,
  setConfirmedSecretOverride,
} from "@/lib/auth/mfa-enrollment-store";

const memoryEnv = {
  AUTH_USERS_BACKEND: "memory",
  AUTH_MFA_ENABLED: "true",
  AUTH_MFA_MODE: "totp",
};

afterEach(() => {
  resetMfaTotpCountersForTests();
  resetMfaRecoveryCodesForTests();
  clearMfaGrants();
  resetMfaDurableFallbackSignalForTests();
  clearConfirmedSecretOverride("user-verify");
  clearConfirmedSecretOverride("user-seed");
  vi.restoreAllMocks();
});

describe("MFA lockout cleanup behaviors", () => {
  it("verifyMfaCode with consumeCounter:false leaves counter unused", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    setConfirmedSecretOverride("user-verify", secret);
    const code = generateTotp(secret);
    const matched = await verifyMfaCode({
      userId: "user-verify",
      code,
      consumeCounter: false,
      env: memoryEnv,
    });
    expect(matched).toMatchObject({ ok: true });
    if (!matched.ok || matched.matchedCounter == null) {
      throw new Error("expected matched counter");
    }
    // Same counter can still be consumed after a failed grant path.
    expect(
      await consumeTotpCounterForUser(
        "user-verify",
        matched.matchedCounter,
        memoryEnv,
      ),
    ).toBe(true);
  });

  it("setTotpCounterForNewSecret and recovery rotate work on memory backend", async () => {
    await setTotpCounterForNewSecret("user-seed", 42, memoryEnv);
    expect(await consumeTotpCounterForUser("user-seed", 42, memoryEnv)).toBe(false);
    expect(await consumeTotpCounterForUser("user-seed", 43, memoryEnv)).toBe(true);

    const codes = await rotateMfaRecoveryCodes("user-seed", memoryEnv);
    expect(codes).toHaveLength(10);
  });

  it("noteMfaDurableFallback marks the recent health signal", () => {
    expect(mfaDurableFallbackRecently()).toBe(false);
    noteMfaDurableFallback("session_grant");
    expect(mfaDurableFallbackRecently()).toBe(true);
  });

  it("issueMfaGrant succeeds on memory so verify can proceed without burning", async () => {
    const grant = await issueMfaGrant("user-grant", Date.now(), 0, memoryEnv);
    expect(grant.length).toBeGreaterThan(20);
  });
});
