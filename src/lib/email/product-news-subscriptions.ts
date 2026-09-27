import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { normalizeMarketingEmail, marketingEmailLookupKey } from "@/lib/email/marketing-consent";
import {
  CONFIRM_LINK_HOURS,
  PREFERENCES_LINK_MINUTES,
  PRODUCT_NEWS_NOTICE,
  PRODUCT_NEWS_NOTICE_VERSION,
  createProductNewsToken,
  productNewsRequestKey,
  readProductNewsConfig,
  verifyProductNewsToken,
} from "@/lib/email/product-news-config";
import { sendTransactionalEmail } from "@/lib/email/send";

type Locale = "en" | "fr";
type BooleanRow = Record<string, boolean>;
function localeOf(value: unknown): Locale { return value === "fr" ? "fr" : "en"; }
function isYes(rows: unknown, field: string): boolean {
  return Array.isArray(rows) && Boolean((rows[0] as BooleanRow | undefined)?.[field]);
}
function publicLink(baseUrl: string, locale: Locale, path: string, token: string): string {
  return `${baseUrl}/${locale}/email-preferences/${path}?token=${encodeURIComponent(token)}`;
}

/** A grant remains pending until the latest link is confirmed by its recipient. */
export async function requestProductNewsSubscription(input: {
  email: unknown;
  locale: unknown;
  clientIp: string;
  source: "public_form" | "account_preferences";
}): Promise<"accepted" | "invalid" | "unavailable"> {
  const config = readProductNewsConfig();
  if (!config.enabled || !config.baseUrl || !config.tokenKeys[0]) return "unavailable";
  const email = normalizeMarketingEmail(input.email);
  const lookup = marketingEmailLookupKey(email);
  if (!email || !lookup) return "invalid";
  const locale = localeOf(input.locale);
  const expiresAt = new Date(Date.now() + CONFIRM_LINK_HOURS * 60 * 60_000);
  const token = createProductNewsToken("confirm", expiresAt, config.tokenKeys);
  const requestKey = productNewsRequestKey(input.clientIp, config.tokenKeys[0]);
  const rows = await getDb().execute(sql`SELECT public.marketing_request_subscription(
    ${randomUUID()}, ${email}, ${lookup}, ${locale},
    ${PRODUCT_NEWS_NOTICE_VERSION}, ${PRODUCT_NEWS_NOTICE[locale]}, ${input.source},
    ${randomUUID()}, ${token.id}, ${token.hash}, ${expiresAt}, ${requestKey}, ${randomUUID()}
  ) AS created`);
  // Generic response for known, throttled, and newly submitted addresses.
  if (!isYes(rows, "created")) return "accepted";
  const confirmUrl = publicLink(config.baseUrl, locale, "confirm", token.token);
  const copy = locale === "fr"
    ? {
        subject: "Confirmez votre inscription aux nouvelles UnionOps",
        text: `Vous avez demandé à recevoir les nouvelles sur les produits UnionOps. Confirmez votre adresse en ouvrant ce lien dans les 48 heures :\n${confirmUrl}\n\nSi vous n’avez rien demandé, ignorez ce message.`,
      }
    : {
        subject: "Confirm your UnionOps product-news subscription",
        text: `You asked to receive UnionOps product news. Confirm your address by opening this link within 48 hours:\n${confirmUrl}\n\nIf you did not request this, ignore this email.`,
      };
  const sent = await sendTransactionalEmail({ to: email, ...copy });
  if (!sent.ok) {
    // Pending state is deliberately never eligible for a campaign.
    return "unavailable";
  }
  return "accepted";
}

/** Send a short-lived no-login preference link without disclosing list membership. */
export async function requestProductNewsPreferences(input: {
  email: unknown;
  locale: unknown;
  clientIp: string;
}): Promise<"accepted" | "invalid" | "unavailable"> {
  const config = readProductNewsConfig();
  if (!isPostgresConfigured() || !config.baseUrl || !config.tokenKeys[0]) return "unavailable";
  const email = normalizeMarketingEmail(input.email);
  const lookup = marketingEmailLookupKey(email);
  if (!email || !lookup) return "invalid";
  const locale = localeOf(input.locale);
  const expiresAt = new Date(Date.now() + PREFERENCES_LINK_MINUTES * 60_000);
  const token = createProductNewsToken("preferences", expiresAt, config.tokenKeys);
  const requestKey = productNewsRequestKey(input.clientIp, config.tokenKeys[0]);
  const rows = await getDb().execute(sql`SELECT public.marketing_issue_preferences(
    ${lookup}, ${token.id}, ${token.hash}, ${expiresAt}, ${requestKey}
  ) AS email`);
  const destination = Array.isArray(rows) ? (rows[0] as { email?: string | null } | undefined)?.email : null;
  if (!destination) return "accepted";
  const link = `${config.baseUrl}/${locale}/email-preferences?token=${encodeURIComponent(token.token)}`;
  const copy = locale === "fr"
    ? { subject: "Gérez vos courriels UnionOps", text: `Ouvrez ce lien dans les 30 minutes pour voir vos préférences et vous désabonner des nouvelles sur les produits UnionOps :\n${link}\n\nSi vous n’avez rien demandé, ignorez ce message.` }
    : { subject: "Manage your UnionOps emails", text: `Open this link within 30 minutes to view your preferences and unsubscribe from UnionOps product news:\n${link}\n\nIf you did not request this, ignore this email.` };
  const sent = await sendTransactionalEmail({ to: destination, ...copy });
  return sent.ok ? "accepted" : "unavailable";
}

export async function confirmProductNewsSubscription(token: unknown): Promise<boolean> {
  const config = readProductNewsConfig();
  if (!config.enabled) return false;
  const hash = verifyProductNewsToken(token, "confirm", config.tokenKeys);
  if (!hash || !isPostgresConfigured()) return false;
  const rows = await getDb().execute(sql`SELECT public.marketing_confirm_subscription(${hash}, ${randomUUID()}) AS confirmed`);
  return isYes(rows, "confirmed");
}

export async function productNewsPreferenceState(token: unknown): Promise<{ email: string; status: string } | null> {
  const config = readProductNewsConfig();
  const hash = verifyProductNewsToken(token, ["preferences", "unsubscribe"], config.tokenKeys);
  if (!hash || !isPostgresConfigured()) return null;
  const rows = await getDb().execute(sql`SELECT * FROM public.marketing_preference_state(${hash})`);
  const record = Array.isArray(rows) ? rows[0] as { email?: string; status?: string } | undefined : undefined;
  return record?.email && record.status ? { email: record.email, status: record.status } : null;
}

/** Valid links immediately suppress future campaign sends. Reuse is idempotent. */
export async function unsubscribeProductNews(token: unknown): Promise<boolean> {
  const config = readProductNewsConfig();
  const hash = verifyProductNewsToken(token, ["preferences", "unsubscribe"], config.tokenKeys);
  if (!hash || !isPostgresConfigured()) return false;
  const rows = await getDb().execute(sql`SELECT public.marketing_unsubscribe(${hash}, ${randomUUID()}) AS unsubscribed`);
  return isYes(rows, "unsubscribed");
}
