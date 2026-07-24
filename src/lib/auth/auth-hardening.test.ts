import { describe, expect, it } from "vitest";
import {
  INSECURE_DEV_AUTH_SECRET,
  resolveAuthSecret,
} from "@/lib/auth/auth-secret";
import { verifyMfaCode } from "@/lib/auth/mfa-policy";
import { generateTotp } from "@/lib/auth/totp";

const mfaOn = { AUTH_MFA_ENABLED: "true" } as const;

describe("resolveAuthSecret (SEC-004)", () => {
  it("returns AUTH_SECRET when set", () => {
    expect(
      resolveAuthSecret({
        AUTH_SECRET: "a".repeat(32),
        NODE_ENV: "production",
      }),
    ).toBe("a".repeat(32));
  });

  it("throws in production runtime when AUTH_SECRET is unset", () => {
    expect(() =>
      resolveAuthSecret({ NODE_ENV: "production" }),
    ).toThrow(/AUTH_SECRET is required/);
  });

  it("allows next production build without AUTH_SECRET", () => {
    expect(
      resolveAuthSecret({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }),
    ).toBe(INSECURE_DEV_AUTH_SECRET);
  });

  it("uses insecure-test-only-secret outside production", () => {
    expect(resolveAuthSecret({ NODE_ENV: "development" })).toBe(
      INSECURE_DEV_AUTH_SECRET,
    );
    expect(resolveAuthSecret({ NODE_ENV: "test" })).toBe(
      INSECURE_DEV_AUTH_SECRET,
    );
  });
});

describe("verifyMfaCode (SEC-002)", () => {
  it("refuses when AUTH_MFA_ENABLED is unset (default off)", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "000000",
      env: { NODE_ENV: "development" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/disabled/i);
  });

  it("fails closed in production when MFA enabled but AUTH_MFA_MODE is unset", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "000000",
      env: { NODE_ENV: "production", ...mfaOn },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("rejects shared_code in production without break-glass", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "000000",
      env: {
        NODE_ENV: "production",
        ...mfaOn,
        AUTH_MFA_MODE: "shared_code_insecure",
        AUTH_MFA_CODE: "000000",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toMatch(/not allowed in production/i);
    }
  });

  it("accepts shared_code in production only with AUTH_ALLOW_SHARED_MFA_IN_PROD", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "424242",
      env: {
        NODE_ENV: "production",
        ...mfaOn,
        AUTH_MFA_MODE: "shared_code_insecure",
        AUTH_MFA_CODE: "424242",
        AUTH_ALLOW_SHARED_MFA_IN_PROD: "true",
      },
    });
    expect(result).toEqual({ ok: true, mode: "shared_code_insecure" });
  });

  it("defaults to shared_code_insecure in non-production when MFA enabled", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "000000",
      env: { NODE_ENV: "development", ...mfaOn },
    });
    expect(result).toEqual({ ok: true, mode: "shared_code_insecure" });
  });

  it("verifies TOTP against the demo user secret", async () => {
    const code = generateTotp("JBSWY3DPEHPK3PXP");
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code,
      env: { NODE_ENV: "production", ...mfaOn, AUTH_MFA_MODE: "totp" },
    });
    expect(result).toEqual({ ok: true, mode: "totp" });
  });

  it("rejects wrong TOTP codes", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "999999",
      env: { NODE_ENV: "production", ...mfaOn, AUTH_MFA_MODE: "totp" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});
