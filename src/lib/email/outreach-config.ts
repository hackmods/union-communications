import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isPostgresConfigured } from "@/lib/db/client";
import { normalizeMarketingEmail } from "@/lib/email/marketing-consent";
import { OUTREACH_LIST_NOTICE_VERSION } from "@/lib/email/outreach-list-notice";

export { OUTREACH_LIST_NOTICE_VERSION };

export const OUTREACH_CONFIRM_LINK_HOURS = 48;
export const OUTREACH_UNSUBSCRIBE_LINK_DAYS = 65;

export type OutreachListsConfig = {
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
  return value && value.length <= maxLength && !/[\u0000-\u001f\u007f<>]/u.test(value)
    ? value
    : null;
}

/** Fail-closed host gate before any outreach list send or public collection. */
export function readOutreachListsConfig(
  env: NodeJS.ProcessEnv = process.env,
): OutreachListsConfig {
  const tokenKeys = (env.UNIONOPS_OUTREACH_LISTS_TOKEN_KEYS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const senderEmail = normalizeMarketingEmail(
    value(env, "UNIONOPS_OUTREACH_LISTS_FROM"),
  );
  const contactEmail = normalizeMarketingEmail(
    value(env, "UNIONOPS_OUTREACH_LISTS_CONTACT_EMAIL"),
  );
  const rawUrl = value(env, "AUTH_URL");
  let baseUrl: string | null = null;
  try {
    const parsed = rawUrl ? new URL(rawUrl) : null;
    if (
      parsed &&
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    ) {
      baseUrl = parsed.origin;
    }
  } catch {
    /* invalid origin */
  }
  const base = {
    approvalReference: safeIdentity(
      value(env, "UNIONOPS_OUTREACH_LISTS_APPROVAL_REFERENCE"),
    ),
    senderName: safeIdentity(value(env, "UNIONOPS_OUTREACH_LISTS_SENDER_NAME"), 120),
    senderEmail,
    contactEmail,
    mailingAddress: safeIdentity(
      value(env, "UNIONOPS_OUTREACH_LISTS_MAILING_ADDRESS"),
      300,
    ),
    baseUrl,
    tokenKeys,
  };
  let reason: string | null = null;
  if (env.UNIONOPS_OUTREACH_LISTS_ENABLED !== "true") reason = "disabled";
  else if (
    env.UNIONOPS_OUTREACH_LISTS_APPROVED_VERSION !== OUTREACH_LIST_NOTICE_VERSION
  ) {
    reason = "notice_not_approved";
  } else if (!base.approvalReference || base.approvalReference.length < 8) {
    reason = "approval_reference_missing";
  } else if (
    !base.senderName ||
    !base.senderEmail ||
    !base.contactEmail ||
    !base.mailingAddress
  ) {
    reason = "sender_identity_missing";
  } else if (!base.baseUrl) reason = "public_origin_missing";
  else if (!base.tokenKeys.length || base.tokenKeys.some((key) => key.length < 32)) {
    reason = "token_keys_missing";
  } else if (!isPostgresConfigured(env)) reason = "durable_storage_missing";
  else if (
    !value(env, "MAILGUN_API_KEY") ||
    !value(env, "MAILGUN_DOMAIN") ||
    (value(env, "MAILGUN_WEBHOOK_SIGNING_KEY")?.length ?? 0) < 16
  ) {
    reason = "mailgun_feedback_missing";
  } else if (
    base.senderEmail?.split("@")[1] !== value(env, "MAILGUN_DOMAIN")?.toLowerCase()
  ) {
    reason = "sender_domain_mismatch";
  } else if (env.EMAIL_ENABLED !== "true") reason = "email_transport_missing";
  return { enabled: reason === null, reason, ...base };
}

export type OutreachTokenPurpose = "confirm" | "unsubscribe";
type TokenPayload = { id: string; purpose: OutreachTokenPurpose; exp: number };

export function createOutreachListToken(
  purpose: OutreachTokenPurpose,
  expiresAt: Date,
  keys: readonly string[],
): { token: string; hash: string; id: string } {
  if (!keys[0] || keys[0].length < 32) {
    throw new Error("Outreach-list signing key is not configured");
  }
  const payload: TokenPayload = { id: randomUUID(), purpose, exp: expiresAt.getTime() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", keys[0]).update(encoded).digest("base64url");
  const token = `${encoded}.${signature}`;
  return { token, hash: outreachListTokenHash(token), id: payload.id };
}

export function outreachListTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyOutreachListToken(
  token: unknown,
  purpose: OutreachTokenPurpose,
  keys: readonly string[],
  now = Date.now(),
): string | null {
  if (
    typeof token !== "string" ||
    token.length > 512 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
  ) {
    return null;
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    return null;
  }
  if (
    !payload ||
    typeof payload.id !== "string" ||
    !/^[0-9a-f-]{36}$/.test(payload.id) ||
    payload.purpose !== purpose ||
    !Number.isSafeInteger(payload.exp) ||
    payload.exp <= now
  ) {
    return null;
  }
  const expected = Buffer.from(signature, "base64url");
  if (expected.length !== 32) return null;
  const valid = keys.some((key) => {
    const actual = createHmac("sha256", key).update(encoded).digest();
    return timingSafeEqual(actual, expected);
  });
  return valid ? outreachListTokenHash(token) : null;
}

export function readOutreachListTokenKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.UNIONOPS_OUTREACH_LISTS_TOKEN_KEYS ?? env.UNIONOPS_PRODUCT_NEWS_TOKEN_KEYS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
