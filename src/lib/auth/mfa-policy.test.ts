import { describe, expect, it } from "vitest";
import {
  isMfaEnabled,
  isSharedMfaBreakGlass,
  needsTotpEnrollment,
  resolveMfaMode,
  sessionMfaOk,
  verifyMfaCode,
} from "@/lib/auth/mfa-policy";

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

  it("is false for demo president who has a seeded secret", async () => {
    expect(
      await needsTotpEnrollment("user-president-243", {
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
      userId: "user-president-243",
      code: "000000",
      env: { NODE_ENV: "development" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/disabled/i);
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
    }
  });
});
