import { describe, expect, it } from "vitest";
import {
  INSECURE_DEV_AUTH_SECRET,
  resolveAuthSecret,
} from "@/lib/auth/auth-secret";
import { verifyMfaCode } from "@/lib/auth/mfa-policy";
import { generateTotp } from "@/lib/auth/totp";

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
  it("fails closed in production when AUTH_MFA_MODE is unset", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "000000",
      env: { NODE_ENV: "production" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("rejects shared_code in production without AUTH_MFA_CODE", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "000000",
      env: {
        NODE_ENV: "production",
        AUTH_MFA_MODE: "shared_code_insecure",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("accepts shared_code with AUTH_MFA_CODE in production", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "424242",
      env: {
        NODE_ENV: "production",
        AUTH_MFA_MODE: "shared_code_insecure",
        AUTH_MFA_CODE: "424242",
      },
    });
    expect(result).toEqual({ ok: true, mode: "shared_code_insecure" });
  });

  it("defaults to shared_code_insecure in non-production and accepts 000000", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "000000",
      env: { NODE_ENV: "development" },
    });
    expect(result).toEqual({ ok: true, mode: "shared_code_insecure" });
  });

  it("verifies TOTP against the demo user secret", async () => {
    const code = generateTotp("JBSWY3DPEHPK3PXP");
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code,
      env: { NODE_ENV: "production", AUTH_MFA_MODE: "totp" },
    });
    expect(result).toEqual({ ok: true, mode: "totp" });
  });

  it("rejects wrong TOTP codes", async () => {
    const result = await verifyMfaCode({
      userId: "user-president-243",
      code: "999999",
      env: { NODE_ENV: "production", AUTH_MFA_MODE: "totp" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});
