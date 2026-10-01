import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyMfaCode } from "@/lib/auth/mfa-policy";
import {
  consumeTotpCounterForUser,
  resetMfaTotpCountersForTests,
} from "@/lib/auth/mfa-totp-counters";
import { resetMfaVerificationAttemptsForTests } from "@/lib/auth/mfa-attempt-limits";
import { generateTotp, matchTotpCounter } from "@/lib/auth/totp";

vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: vi.fn(async () => {
    throw new Error("simulated Postgres outage");
  }),
}));

const secret = "JBSWY3DPEHPK3PXP";
const at = new Date("2026-09-27T16:00:00.000Z");
const env = {
  NODE_ENV: "production",
  AUTH_MFA_ENABLED: "true",
  AUTH_MFA_MODE: "totp",
};

describe("TOTP replay protection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(at);
    vi.stubEnv("AUTH_USERS_BACKEND", "memory");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("UNIONOPS_HOSTED_CUSTOMER_MODE", "");
    resetMfaTotpCountersForTests();
    resetMfaVerificationAttemptsForTests();
  });

  afterEach(() => {
    resetMfaTotpCountersForTests();
    resetMfaVerificationAttemptsForTests();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("returns the exact accepted counter from the clock-skew window", () => {
    const previousStep = generateTotp(secret, at.getTime() - 30_000);
    expect(matchTotpCounter(secret, previousStep, at.getTime())).toBe(
      Math.floor(at.getTime() / 30_000) - 1,
    );
    expect(matchTotpCounter(secret, "bad-code", at.getTime())).toBeNull();
  });

  it("accepts a TOTP counter once and rejects replays", async () => {
    const code = generateTotp(secret, at.getTime());
    const first = await verifyMfaCode({ userId: "user-president-7", code, env });
    const replay = await verifyMfaCode({ userId: "user-president-7", code, env });

    expect(first).toMatchObject({ ok: true, mode: "totp" });
    expect(replay).toMatchObject({ ok: false, status: 400 });
  });

  it("allows only one concurrent use of the same counter", async () => {
    const code = generateTotp(secret, at.getTime());
    const results = await Promise.all([
      verifyMfaCode({ userId: "user-president-7", code, env }),
      verifyMfaCode({ userId: "user-president-7", code, env }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("does not accept a replay counter from process memory when Postgres fails", async () => {
    await expect(
      consumeTotpCounterForUser("user-outage", 123, {
        AUTH_USERS_BACKEND: "postgres",
        DATABASE_URL: "postgres://example.invalid/unionops",
        UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
      } as unknown as NodeJS.ProcessEnv),
    ).rejects.toThrow("simulated Postgres outage");
  });
});
