import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: vi.fn(async () => {
    throw new Error("simulated Postgres outage");
  }),
}));
import {
  MFA_ATTEMPT_LIMIT,
  MFA_ATTEMPT_WINDOW_MS,
  reserveMfaVerificationAttempt,
  resetMfaVerificationAttemptsForTests,
} from "@/lib/auth/mfa-attempt-limits";

const memoryEnv = { AUTH_USERS_BACKEND: "memory" };

afterEach(() => resetMfaVerificationAttemptsForTests());

describe("MFA verification attempt limit", () => {
  it("allows the configured attempts and returns a reset delay when exhausted", async () => {
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < MFA_ATTEMPT_LIMIT; attempt += 1) {
      expect(await reserveMfaVerificationAttempt("account-a", now, memoryEnv)).toMatchObject({
        allowed: true,
      });
    }
    expect(await reserveMfaVerificationAttempt("account-a", now, memoryEnv)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 900,
    });
    expect(
      await reserveMfaVerificationAttempt(
        "account-a",
        now + MFA_ATTEMPT_WINDOW_MS,
        memoryEnv,
      ),
    ).toMatchObject({ allowed: true });
  });

  it("keeps each account's window separate", async () => {
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < MFA_ATTEMPT_LIMIT; attempt += 1) {
      await reserveMfaVerificationAttempt("account-a", now, memoryEnv);
    }
    expect(await reserveMfaVerificationAttempt("account-b", now, memoryEnv)).toMatchObject({
      allowed: true,
    });
  });

  it("fails closed when hosted mode lacks durable account storage", async () => {
    await expect(
      reserveMfaVerificationAttempt("account-a", Date.now(), {
        UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
      }),
    ).rejects.toThrow(/durable PostgreSQL storage/i);
  });

  it("fails closed when the selected Postgres attempt store throws", async () => {
    const env = {
      AUTH_USERS_BACKEND: "postgres",
      DATABASE_URL: "postgres://example.invalid/unionops",
      UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
    };
    await expect(
      reserveMfaVerificationAttempt("account-fallback", Date.now(), env),
    ).rejects.toThrow("simulated Postgres outage");
  });

  it("fails closed on a selected Postgres backend outside hosted mode too", async () => {
    const env = {
      AUTH_USERS_BACKEND: "postgres",
      DATABASE_URL: "postgres://example.invalid/unionops",
      NODE_ENV: "development",
    };
    await expect(
      reserveMfaVerificationAttempt("account-dev-postgres", Date.now(), env),
    ).rejects.toThrow("simulated Postgres outage");
  });

  it("documents CapRover failure: Date#toString is not a Postgres timestamptz", () => {
    // Regression guard for the hosted MFA lockout where sql`${date}` bound
    // Date#toString() ("Wed Sep 30 2026 … GMT…") and Postgres rejected it.
    const instant = new Date("2026-09-30T23:10:25.493Z");
    expect(String(instant)).toMatch(/^Wed /);
    expect(String(instant)).toMatch(/GMT/);
    expect(instant.toISOString()).toBe("2026-09-30T23:10:25.493Z");
    expect(instant.toISOString()).not.toMatch(/GMT|Wed /);
  });
});
