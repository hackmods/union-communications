import { afterEach, describe, expect, it } from "vitest";
import { resetMfaEnrollmentStoreForTests } from "@/lib/auth/mfa-enrollment-store";
import {
  getTotpSecretForUser,
  persistTotpSecretForUser,
} from "@/lib/auth/mfa-user-secret";

describe("mfa-user-secret (demo roster path)", () => {
  afterEach(() => {
    resetMfaEnrollmentStoreForTests();
  });

  it("falls back to the demo roster's static secret", async () => {
    const secret = await getTotpSecretForUser("user-president-243");
    expect(secret).toBe("JBSWY3DPEHPK3PXP");
  });

  it("returns null for unknown users", async () => {
    const secret = await getTotpSecretForUser("user-does-not-exist");
    expect(secret).toBeNull();
  });

  it("prefers a confirmed override once enrolled", async () => {
    await persistTotpSecretForUser("user-president-243", "AAAABBBBCCCCDDDD");
    const secret = await getTotpSecretForUser("user-president-243");
    expect(secret).toBe("AAAABBBBCCCCDDDD");
  });

  it("enrolls a solo user who previously had no secret", async () => {
    expect(await getTotpSecretForUser("user-solo")).toBeNull();
    await persistTotpSecretForUser("user-solo", "EEEEFFFFGGGGHHHH");
    expect(await getTotpSecretForUser("user-solo")).toBe("EEEEFFFFGGGGHHHH");
  });
});
