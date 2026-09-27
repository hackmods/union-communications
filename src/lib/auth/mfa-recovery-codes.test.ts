import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeMfaRecoveryCode,
  countUnusedMfaRecoveryCodes,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  resetMfaRecoveryCodesForTests,
  rotateMfaRecoveryCodes,
} from "@/lib/auth/mfa-recovery-codes";

describe("MFA recovery codes", () => {
  beforeEach(() => resetMfaRecoveryCodesForTests());

  it("generates unique high-entropy codes and hashes normalized values", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}$/.test(code))).toBe(true);
    expect(normalizeRecoveryCode(codes[0]!.toLowerCase().replaceAll("-", " "))).toBe(
      normalizeRecoveryCode(codes[0]!),
    );
    expect(hashRecoveryCode(codes[0]!)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRecoveryCode(codes[0]!)).not.toContain(normalizeRecoveryCode(codes[0]!));
  });

  it("consumes a recovery code once and only for its owner", async () => {
    const env = { AUTH_USERS_BACKEND: "memory" } as unknown as NodeJS.ProcessEnv;
    const [code] = await rotateMfaRecoveryCodes("user-a", env);
    expect(await countUnusedMfaRecoveryCodes("user-a", env)).toBe(10);
    expect(await consumeMfaRecoveryCode("user-b", code!, env)).toBe(false);
    expect(await consumeMfaRecoveryCode("user-a", code!.toLowerCase(), env)).toBe(true);
    expect(await consumeMfaRecoveryCode("user-a", code!, env)).toBe(false);
    expect(await countUnusedMfaRecoveryCodes("user-a", env)).toBe(9);
  });

  it("rotation invalidates all earlier active codes", async () => {
    const env = { AUTH_USERS_BACKEND: "memory" } as unknown as NodeJS.ProcessEnv;
    const [oldCode] = await rotateMfaRecoveryCodes("user-a", env);
    const newCodes = await rotateMfaRecoveryCodes("user-a", env);
    expect(newCodes).toHaveLength(10);
    expect(await consumeMfaRecoveryCode("user-a", oldCode!, env)).toBe(false);
    expect(await countUnusedMfaRecoveryCodes("user-a", env)).toBe(10);
  });

  it("makes a credential single-use under concurrent consumption", async () => {
    const env = { AUTH_USERS_BACKEND: "memory" } as unknown as NodeJS.ProcessEnv;
    const [code] = await rotateMfaRecoveryCodes("user-a", env);
    const results = await Promise.all([
      consumeMfaRecoveryCode("user-a", code!, env),
      consumeMfaRecoveryCode("user-a", code!, env),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("fails closed instead of using memory storage in hosted mode", async () => {
    const env = {
      AUTH_USERS_BACKEND: "memory",
      UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
    } as unknown as NodeJS.ProcessEnv;
    await expect(rotateMfaRecoveryCodes("user-a", env)).rejects.toThrow(
      "durable Postgres storage",
    );
  });
});
