import { afterEach, describe, expect, it } from "vitest";
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
});
