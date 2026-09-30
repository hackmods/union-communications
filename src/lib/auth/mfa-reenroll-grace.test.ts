import { afterEach, describe, expect, it } from "vitest";
import {
  armMfaReenrollGrace,
  clearMfaReenrollGrace,
  isMfaReenrollGraceActive,
  resetMfaReenrollGraceMemoryForTests,
} from "@/lib/auth/mfa-reenroll-grace";
import { sessionRequiresMfaWithGrace } from "@/lib/auth/mfa-requirements-grace";

const memoryEnv = {
  AUTH_USERS_BACKEND: "memory",
} as unknown as NodeJS.ProcessEnv;

afterEach(() => {
  resetMfaReenrollGraceMemoryForTests();
});

describe("MFA re-enroll grace", () => {
  it("arms for 24h and clears after enroll-style clear", async () => {
    const now = Date.parse("2026-09-30T12:00:00.000Z");
    const until = await armMfaReenrollGrace(
      "user-grace",
      now + 24 * 60 * 60_000,
      memoryEnv,
    );
    expect(until.toISOString()).toBe("2026-10-01T12:00:00.000Z");
    expect(await isMfaReenrollGraceActive("user-grace", now, memoryEnv)).toBe(true);
    expect(
      await isMfaReenrollGraceActive("user-grace", until.getTime() + 1, memoryEnv),
    ).toBe(false);

    await clearMfaReenrollGrace("user-grace", memoryEnv);
    expect(await isMfaReenrollGraceActive("user-grace", now, memoryEnv)).toBe(false);
  });

  it("sessionRequiresMfaWithGrace returns false while grace is active", async () => {
    const now = Date.now();
    await armMfaReenrollGrace("user-officer", now + 60_000, memoryEnv);
    expect(
      await sessionRequiresMfaWithGrace(
        {
          id: "user-officer",
          email: "officer@example.com",
          roles: ["local_president"],
          mfaRequired: true,
        },
        true,
        true,
        memoryEnv,
      ),
    ).toBe(false);
  });
});
