import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isPostgresConfigured } from "@/lib/db/client";
import { normalizeMarketingEmail } from "@/lib/email/marketing-consent";

/**
 * Change this identifier whenever either locale's exact consent notice changes.
 * A reviewer approves the two catalog values together under this identifier.
 */
export const PRODUCT_NEWS_NOTICE_VERSION = "product-news-2026-09-v1";
export const PRODUCT_NEWS_NOTICE = {
  en: "I want occasional UnionOps product news by email. I can unsubscribe at any time. Union member lists will not be used.",
  fr: "Je souhaite recevoir à l’occasion des nouvelles sur les produits UnionOps par courriel. Je peux me désabonner en tout temps. Les listes de membres des syndicats ne seront pas utilisées.",
} as const;
export const CONFIRM_LINK_HOURS = 48;
export const PREFERENCES_LINK_MINUTES = 30;
export const UNSUBSCRIBE_LINK_DAYS = 65;

export type ProductNewsConfig = {
  enabled: boolean;
  reason: string | null;
  approvalReference: string | null;
  senderName: string | null;
  senderEmail: string | null;
  contactEmail: string | null;
  mailingAddress: string | null;
  baseUrl: string | null;
  tokenKeys: string[];
};

function value(env: NodeJS.ProcessEnv, key: string): string | null {
  return env[key]?.trim() || null;
}

function safeIdentity(value: string | null, maxLength = 300): string | null {
  return value && value.length <= maxLength && !/[\u0000-\u001f\u007f<>]/u.test(value) ? value : null;
}

/** Actual sends and collection require every approval/configuration input. */
export function readProductNewsConfig(env: NodeJS.ProcessEnv = process.env): ProductNewsConfig {
  const tokenKeys = (env.UNIONOPS_PRODUCT_NEWS_TOKEN_KEYS ?? "")
    .split(",").map((entry) => entry.trim()).filter(Boolean);
  const senderEmail = normalizeMarketingEmail(value(env, "UNIONOPS_PRODUCT_NEWS_FROM"));
  const contactEmail = normalizeMarketingEmail(value(env, "UNIONOPS_PRODUCT_NEWS_CONTACT_EMAIL"));
  const rawUrl = value(env, "AUTH_URL");
  let baseUrl: string | null = null;
  try {
    const parsed = rawUrl ? new URL(rawUrl) : null;
    if (parsed && parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash) {
      baseUrl = parsed.origin;
    }
  } catch {
    // An invalid public origin cannot produce email links.
  }
  const base = {
    approvalReference: safeIdentity(value(env, "UNIONOPS_PRODUCT_NEWS_APPROVAL_REFERENCE")),
    senderName: safeIdentity(value(env, "UNIONOPS_PRODUCT_NEWS_SENDER_NAME"), 120),
    senderEmail,
    contactEmail,
    mailingAddress: safeIdentity(value(env, "UNIONOPS_PRODUCT_NEWS_MAILING_ADDRESS"), 300),
    baseUrl,
    tokenKeys,
  };
  let reason: string | null = null;
  if (env.UNIONOPS_PRODUCT_NEWS_ENABLED !== "true") reason = "disabled";
  else if (env.UNIONOPS_PRODUCT_NEWS_APPROVED_VERSION !== PRODUCT_NEWS_NOTICE_VERSION) reason = "notice_not_approved";
  else if (!base.approvalReference || base.approvalReference.length < 8) reason = "approval_reference_missing";
  else if (!base.senderName || !base.senderEmail || !base.contactEmail || !base.mailingAddress) reason = "sender_identity_missing";
  else if (!base.baseUrl) reason = "public_origin_missing";
  else if (!base.tokenKeys.length || base.tokenKeys.some((key) => key.length < 32)) reason = "token_keys_missing";
  else if (!isPostgresConfigured(env)) reason = "durable_storage_missing";
  else if (!value(env, "MAILGUN_API_KEY") || !value(env, "MAILGUN_DOMAIN")
    || (value(env, "MAILGUN_WEBHOOK_SIGNING_KEY")?.length ?? 0) < 16) reason = "mailgun_feedback_missing";
  else if (base.senderEmail?.split("@")[1] !== value(env, "MAILGUN_DOMAIN")?.toLowerCase()) reason = "sender_domain_mismatch";
  else if (env.EMAIL_ENABLED !== "true") reason = "email_transport_missing";
  return { enabled: reason === null, reason, ...base };
}

export type ProductNewsTokenPurpose = "confirm" | "preferences" | "unsubscribe";
type TokenPayload = { id: string; purpose: ProductNewsTokenPurpose; exp: number };

export function createProductNewsToken(
  purpose: ProductNewsTokenPurpose,
  expiresAt: Date,
  keys: readonly string[],
): { token: string; hash: string; id: string } {
  if (!keys[0] || keys[0].length < 32) throw new Error("Product-news signing key is not configured");
  const payload: TokenPayload = { id: randomUUID(), purpose, exp: expiresAt.getTime() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", keys[0]).update(encoded).digest("base64url");
  const token = encoded + "." + signature;
  return { token, hash: productNewsTokenHash(token), id: payload.id };
}

export function productNewsTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyProductNewsToken(
  token: unknown,
  purpose: ProductNewsTokenPurpose | readonly ProductNewsTokenPurpose[],
  keys: readonly string[],
  now = Date.now(),
): string | null {
  if (typeof token !== "string" || token.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    return null;
  }
  const allowed = Array.isArray(purpose) ? purpose : [purpose];
  if (!payload || typeof payload.id !== "string" || !/^[0-9a-f-]{36}$/.test(payload.id)
    || !allowed.includes(payload.purpose) || !Number.isSafeInteger(payload.exp) || payload.exp <= now) return null;
  const expected = Buffer.from(signature, "base64url");
  if (expected.length !== 32) return null;
  const valid = keys.some((key) => {
    const actual = createHmac("sha256", key).update(encoded).digest();
    return timingSafeEqual(actual, expected);
  });
  return valid ? productNewsTokenHash(token) : null;
}

/** Stable HMAC rate-limit key; never store the source IP or token key. */
export function productNewsRequestKey(ip: string, key: string): string {
  return createHmac("sha256", key).update("product-news-request:" + ip.trim()).digest("hex");
}
