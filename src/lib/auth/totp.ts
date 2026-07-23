/**
 * Minimal RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits).
 * No third-party OTP dependency — Node crypto only.
 */

import { createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw new Error("Invalid base32 character");
    }
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(buf).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

export function generateTotp(
  secretBase32: string,
  atMs = Date.now(),
  stepSeconds = 30,
): string {
  const secret = decodeBase32(secretBase32);
  const counter = Math.floor(atMs / 1000 / stepSeconds);
  return hotp(secret, counter);
}

/** Accept current ±1 window to absorb clock skew. */
export function verifyTotp(
  secretBase32: string,
  code: string,
  atMs = Date.now(),
  stepSeconds = 30,
  window = 1,
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = decodeBase32(secretBase32);
  const counter = Math.floor(atMs / 1000 / stepSeconds);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, counter + w) === code) return true;
  }
  return false;
}
