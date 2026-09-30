/**
 * Application-level AES-256-GCM for TOTP secrets at rest.
 *
 * Dedicated host key (not AUTH_SECRET) so rotating session signing does not
 * brick authenticator enrollment. Legacy plaintext base32 still decrypts so
 * restored backups from before this change keep working.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { hostedCustomerProfileEnabled } from "@/lib/auth/mfa-requirements";

export const TOTP_SECRET_ENC_PREFIX = "uov1.";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export function isEncryptedTotpSecret(value: string): boolean {
  return value.startsWith(TOTP_SECRET_ENC_PREFIX);
}

export function parseTotpEncryptionKey(raw: string | undefined): Buffer | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const buf = Buffer.from(trimmed, "base64");
  if (buf.length === KEY_LENGTH) return buf;
  throw new Error(
    "AUTH_TOTP_ENCRYPTION_KEY must be 32 bytes as base64 or 64-character hex.",
  );
}

export function totpEncryptionRequired(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const usersPostgres =
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres";
  if (!usersPostgres) return false;
  if (hostedCustomerProfileEnabled(env)) return true;
  return env.NODE_ENV === "production";
}

export function isTotpEncryptionConfigured(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  try {
    return parseTotpEncryptionKey(env.AUTH_TOTP_ENCRYPTION_KEY) !== null;
  } catch {
    return false;
  }
}

function keysFor(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): { current: Buffer | null; previous: Buffer | null } {
  return {
    current: parseTotpEncryptionKey(env.AUTH_TOTP_ENCRYPTION_KEY),
    previous: parseTotpEncryptionKey(env.AUTH_TOTP_ENCRYPTION_KEY_PREVIOUS),
  };
}

export function assertTotpEncryptionAvailable(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): void {
  if (!totpEncryptionRequired(env)) return;
  if (parseTotpEncryptionKey(env.AUTH_TOTP_ENCRYPTION_KEY)) return;
  throw new Error(
    "Hosted or production Postgres MFA requires AUTH_TOTP_ENCRYPTION_KEY (32-byte base64).",
  );
}

function aadFor(userId: string): Buffer {
  return Buffer.from(userId, "utf8");
}

export function encryptTotpSecret(
  plaintext: string,
  userId: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  if (!plaintext) return plaintext;
  if (isEncryptedTotpSecret(plaintext)) return plaintext;
  assertTotpEncryptionAvailable(env);
  const key = parseTotpEncryptionKey(env.AUTH_TOTP_ENCRYPTION_KEY);
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aadFor(userId));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, ciphertext]);
  return `${TOTP_SECRET_ENC_PREFIX}${packed.toString("base64url")}`;
}

function decryptWithKey(
  packed: Buffer,
  userId: string,
  key: Buffer,
): string {
  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(aadFor(userId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}

export function decryptTotpSecret(
  stored: string,
  userId: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  if (!stored || !isEncryptedTotpSecret(stored)) return stored;
  const packed = Buffer.from(stored.slice(TOTP_SECRET_ENC_PREFIX.length), "base64url");
  if (packed.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error("Encrypted TOTP secret is truncated.");
  }
  const { current, previous } = keysFor(env);
  const candidates = [current, previous].filter((key): key is Buffer => Boolean(key));
  if (candidates.length === 0) {
    throw new Error(
      "Encrypted TOTP secret cannot be read without AUTH_TOTP_ENCRYPTION_KEY.",
    );
  }
  let lastError: unknown;
  for (const key of candidates) {
    try {
      return decryptWithKey(packed, userId, key);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not decrypt TOTP secret with the configured host key.");
}

/** Constant-time prefix check helper for tests. */
export function encryptionKeysMatch(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
