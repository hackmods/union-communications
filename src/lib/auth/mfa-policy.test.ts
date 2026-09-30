import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isMfaEnabled,
  isHostedCustomerMode,
  isSharedMfaBreakGlass,
  needsTotpEnrollment,
  resolveMfaMode,
  sessionMfaOk,
  verifyMfaCode,
} from "@/lib/auth/mfa-policy";
import * as attemptLimits from "@/lib/auth/mfa-attempt-limits";
import { resetMfaVerificationAttemptsForTests } from "@/lib/auth/mfa-attempt-limits";

afterEach(() => {
  resetMfaVerificationAttemptsForTests();
  vi.restoreAllMocks();
});

describe("isMfaEnabled (opt-in, default off)", () => {
  it("is false when unset", () => {
    expect(isMfaEnabled({})).toBe(false);
    expect(isMfaEnabled({ AUTH_MFA_ENABLED: "false" })).toBe(false);
  });

  it("is true only for explicit truthy values", () => {
    expect(isMfaEnabled({ AUTH_MFA_ENABLED: "true" })).toBe(true);
    expect(isMfaEnabled({ AUTH_MFA_ENABLED: "1" })).toBe(true);
    expect(isMfaEnabled({ AUTH_MFA_ENABLED: "yes" })).toBe(true);
  });

  it("cannot be disabled in the hosted customer profile", () => {
    expect(
      isMfaEnabled({ UNIONOPS_HOSTED_CUSTOMER_MODE: "true" }),
    ).toBe(true);
    expect(
      isHostedCustomerMode({ UNIONOPS_HOSTED_CUSTOMER_MODE: "yes" }),
    ).toBe(true);
  });
});

describe("sessionMfaOk", () => {
  it("passes when MFA is disabled even if claim is false", () => {
    expect(sessionMfaOk({ user: { mfaVerified: false } }, {})).toBe(true);
  });

  it("requires mfaVerified when MFA is enabled", () => {
    const env = { AUTH_MFA_ENABLED: "true" };
    expect(sessionMfaOk({ user: { mfaVerified: false } }, env)).toBe(false);
    expect(sessionMfaOk({ user: { mfaVerified: true } }, env)).toBe(true);
  });

  it("requires hosted MFA for privileged roles but not basic local members", () => {
    const env = { NODE_ENV: "production", UNIONOPS_HOSTED_CUSTOMER_MODE: "true" };
    expect(sessionMfaOk({ user: { roles: ["local_steward"], mfaVerified: false } }, env)).toBe(false);
    expect(sessionMfaOk({ user: { roles: ["local_steward"], mfaVerified: true } }, env)).toBe(true);
    expect(sessionMfaOk({ user: { roles: ["local_member"], mfaVerified: false } }, env)).toBe(true);
  });
});

describe("resolveMfaMode (when MFA enabled)", () => {
  it("returns null when MFA is disabled", () => {
    expect(resolveMfaMode({ NODE_ENV: "development" })).toBeNull();
    expect(
      resolveMfaMode({
        NODE_ENV: "production",
        AUTH_MFA_MODE: "totp",
      }),
    ).toBeNull();
  });

  it("defaults to shared_code outside production when enabled", () => {
    expect(
      resolveMfaMode({
        NODE_ENV: "development",
        AUTH_MFA_ENABLED: "true",
      }),
    ).toBe("shared_code_insecure");
  });

  it("requires explicit mode in production when enabled", () => {
    expect(
      resolveMfaMode({ NODE_ENV: "production", AUTH_MFA_ENABLED: "true" }),
    ).toBeNull();
  });

  it("accepts totp in production when enabled", () => {
    expect(
      resolveMfaMode({
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "totp",
      }),
    ).toBe("totp");
  });

  it("rejects shared_code in production without break-glass", () => {
    expect(
      resolveMfaMode({
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "shared_code_insecure",
      }),
    ).toBeNull();
    expect(
      isSharedMfaBreakGlass({
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "shared_code_insecure",
      }),
    ).toBe(false);
  });

  it("allows shared_code in production with break-glass", () => {
    const env = {
      NODE_ENV: "production",
      AUTH_MFA_ENABLED: "true",
      AUTH_MFA_MODE: "shared_code_insecure",
      AUTH_ALLOW_SHARED_MFA_IN_PROD: "true",
    };
    expect(resolveMfaMode(env)).toBe("shared_code_insecure");
    expect(isSharedMfaBreakGlass(env)).toBe(true);
  });

  it("requires production TOTP for hosted customer mode", () => {
    expect(
      resolveMfaMode({
        NODE_ENV: "production",
        UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
        AUTH_MFA_ENABLED: "false",
        AUTH_MFA_MODE: "totp",
      }),
    ).toBe("totp");
    expect(
      resolveMfaMode({
        NODE_ENV: "production",
        UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
        AUTH_MFA_MODE: "shared_code_insecure",
        AUTH_ALLOW_SHARED_MFA_IN_PROD: "true",
      }),
    ).toBeNull();
    expect(
      resolveMfaMode({
        NODE_ENV: "development",
        UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
        AUTH_MFA_MODE: "totp",
      }),
    ).toBeNull();
  });
});

describe("needsTotpEnrollment", () => {
  it("is false when MFA is disabled", async () => {
    expect(
      await needsTotpEnrollment("user-definitely-missing", {
        NODE_ENV: "production",
        AUTH_MFA_MODE: "totp",
      }),
    ).toBe(false);
  });

  it("is true for totp mode when user has no secret", async () => {
    expect(
      await needsTotpEnrollment("user-definitely-missing", {
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "totp",
      }),
    ).toBe(true);
  });

  it("does not force enrollment when the current user has no hosted MFA requirement", async () => {
    expect(await needsTotpEnrollment(
      "user-definitely-missing",
      {
        NODE_ENV: "production",
        UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
        AUTH_MFA_MODE: "totp",
      },
      false,
    )).toBe(false);
  });

  it("is false for demo president who has a seeded secret", async () => {
    expect(
      await needsTotpEnrollment("user-president-7", {
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "totp",
      }),
    ).toBe(false);
  });
});

describe("verifyMfaCode", () => {
  it("refuses when MFA is disabled", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-7",
      code: "000000",
      env: { NODE_ENV: "development" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/disabled/i);
  });

  it("rejects empty codes before reserving an attempt", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-7",
      code: "  ",
      env: {
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "totp",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.code).toBe("empty");
    }
  });

  it("returns replayed when the same TOTP counter is used twice", async () => {
    const { generateTotp } = await import("@/lib/auth/totp");
    const { resetMfaTotpCountersForTests } = await import(
      "@/lib/auth/mfa-totp-counters"
    );
    resetMfaTotpCountersForTests();
    const code = generateTotp("JBSWY3DPEHPK3PXP");
    const env = {
      NODE_ENV: "production",
      AUTH_MFA_ENABLED: "true",
      AUTH_MFA_MODE: "totp",
    };
    const first = await verifyMfaCode({
      userId: "user-president-7",
      code,
      env,
    });
    expect(first.ok).toBe(true);
    const second = await verifyMfaCode({
      userId: "user-president-7",
      code,
      env,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("replayed");
  });

  it("returns attempt_store_unavailable when attempt reservation throws", async () => {
    vi.spyOn(attemptLimits, "reserveMfaVerificationAttempt").mockRejectedValue(
      new Error("Failed query: insert into mfa_verification_attempts"),
    );
    const result = await verifyMfaCode({
      userId: "user-president-7",
      code: "123456",
      env: {
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "totp",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.code).toBe("attempt_store_unavailable");
    }
  });

  it("returns TOTP not enrolled when secret missing", async () => {
    const result = await verifyMfaCode({
      userId: "user-definitely-missing",
      code: "123456",
      env: {
        NODE_ENV: "production",
        AUTH_MFA_ENABLED: "true",
        AUTH_MFA_MODE: "totp",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toMatch(/not enrolled/i);
      expect(result.code).toBe("not_enrolled");
    }
  });
});
