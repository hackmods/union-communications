import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { generateTotp, verifyTotp } from "@/lib/auth/totp";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  isEncryptedTotpSecret,
  isTotpEncryptionConfigured,
  parseTotpEncryptionKey,
  totpEncryptionRequired,
} from "@/lib/auth/totp-secret-crypto";

const KEY = randomBytes(32).toString("base64");
const OTHER = randomBytes(32).toString("base64");
const SECRET = "JBSWY3DPEHPK3PXP";

describe("totp-secret-crypto", () => {
  afterEach(() => {
    // no env stubs in this file — callers pass env objects
  });

  it("parses 32-byte base64 and 64-char hex keys", () => {
    expect(parseTotpEncryptionKey(KEY)?.length).toBe(32);
    const hex = randomBytes(32).toString("hex");
    expect(parseTotpEncryptionKey(hex)?.length).toBe(32);
    expect(parseTotpEncryptionKey("")).toBeNull();
    expect(parseTotpEncryptionKey(undefined)).toBeNull();
    expect(() => parseTotpEncryptionKey("too-short")).toThrow(/32 bytes/);
  });

  it("round-trips a TOTP secret bound to the account id", () => {
    const env = { AUTH_TOTP_ENCRYPTION_KEY: KEY };
    const sealed = encryptTotpSecret(SECRET, "user-president-7", env);
    expect(isEncryptedTotpSecret(sealed)).toBe(true);
    expect(sealed).not.toContain(SECRET);
    expect(decryptTotpSecret(sealed, "user-president-7", env)).toBe(SECRET);
    expect(() => decryptTotpSecret(sealed, "user-other", env)).toThrow();
  });

  it("leaves legacy plaintext readable so restored pre-encryption backups work", () => {
    expect(decryptTotpSecret(SECRET, "user-a", { AUTH_TOTP_ENCRYPTION_KEY: KEY })).toBe(
      SECRET,
    );
  });

  it("decrypts with the previous key after rotation", () => {
    const sealed = encryptTotpSecret(SECRET, "user-a", {
      AUTH_TOTP_ENCRYPTION_KEY: KEY,
    });
    expect(
      decryptTotpSecret(sealed, "user-a", {
        AUTH_TOTP_ENCRYPTION_KEY: OTHER,
        AUTH_TOTP_ENCRYPTION_KEY_PREVIOUS: KEY,
      }),
    ).toBe(SECRET);
  });

  it("still verifies TOTP after a simulated backup restore of ciphertext", () => {
    const env = { AUTH_TOTP_ENCRYPTION_KEY: KEY };
    const backup = encryptTotpSecret(SECRET, "user-restore", env);
    const restored = decryptTotpSecret(backup, "user-restore", env);
    expect(verifyTotp(restored, generateTotp(SECRET))).toBe(true);
  });

  it("fails closed when a restored ciphertext is opened without its preserved key", () => {
    const sealed = encryptTotpSecret(SECRET, "user-restore", {
      AUTH_TOTP_ENCRYPTION_KEY: KEY,
    });
    expect(() =>
      decryptTotpSecret(sealed, "user-restore", {
        AUTH_TOTP_ENCRYPTION_KEY: OTHER,
      }),
    ).toThrow();
    expect(() => decryptTotpSecret(sealed, "user-restore", {})).toThrow(
      /AUTH_TOTP_ENCRYPTION_KEY/,
    );
  });

  it("stores plaintext when no key is set outside hosted/production postgres", () => {
    const env = { AUTH_USERS_BACKEND: "memory", NODE_ENV: "development" };
    expect(totpEncryptionRequired(env)).toBe(false);
    expect(encryptTotpSecret(SECRET, "user-a", env)).toBe(SECRET);
    expect(isTotpEncryptionConfigured(env)).toBe(false);
  });

  it("fails closed in hosted postgres without a key", () => {
    const env = {
      AUTH_USERS_BACKEND: "postgres",
      UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
      NODE_ENV: "production",
    };
    expect(totpEncryptionRequired(env)).toBe(true);
    expect(() => encryptTotpSecret(SECRET, "user-a", env)).toThrow(
      /AUTH_TOTP_ENCRYPTION_KEY/,
    );
  });
});
