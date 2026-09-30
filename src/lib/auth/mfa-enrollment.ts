/**
 * TOTP enrollment helpers (SEC-002 follow-up).
 * Secret generation + otpauth:// URI only — verification stays in
 * `src/lib/auth/totp.ts`, persistence stays in `mfa-enrollment-store.ts` /
 * `mfa-user-secret.ts`.
 */

import { randomBytes } from "node:crypto";
import { resolvePublicOrigin } from "@/lib/seo/public-origin";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 160-bit (20 byte) base32 secret — RFC 4226 recommended minimum length. */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let secret = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

export const TOTP_ISSUER = "UnionOps";
export const TOTP_AUTHENTICATOR_ICON_PATH =
  "/assets/unionops/authenticator-icon.png";

/** HTTPS icon URL for authenticator apps. HTTP origins are omitted (most apps refuse them). */
export function resolveTotpAuthenticatorImageUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | undefined {
  const origin = resolvePublicOrigin({ authUrl: env.AUTH_URL });
  if (!origin?.startsWith("https://")) return undefined;
  return `${origin}${TOTP_AUTHENTICATOR_ICON_PATH}`;
}

/** Builds the `otpauth://` URI most authenticator apps can scan or import. */
export function buildOtpauthUri(
  secret: string,
  accountLabel: string,
  issuer: string = TOTP_ISSUER,
  imageUrl?: string,
): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  if (imageUrl?.startsWith("https://")) {
    params.set("image", imageUrl);
  }
  return `otpauth://totp/${label}?${params.toString()}`;
}
