import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import {
  UNSUBSCRIBE_LINK_DAYS,
  createProductNewsToken,
  readProductNewsConfig,
  type ProductNewsConfig,
} from "@/lib/email/product-news-config";
import { sendClassifiedEmail } from "@/lib/email/send";

type Claim = {
  id: string;
  subscriberId: string;
  campaignId: string;
  kind: "campaign" | "test";
  email: string;
  locale: "en" | "fr";
  subject: string;
  body: string;
  token: string;
};
type Candidate = {
  id: string; subscriber_id: string; campaign_id: string; kind: "campaign" | "test";
  subject_en: string; subject_fr: string; body_en: string; body_fr: string;
};
type Subscriber = { id: string; email: string; locale: "en" | "fr"; status: string };

function sendIntervalMs(): number {
  const value = Number(process.env.UNIONOPS_PRODUCT_NEWS_SEND_INTERVAL_MS ?? "3000");
  return Number.isSafeInteger(value) && value >= 1000 && value <= 60_000 ? value : 3000;
}

async function claimNext(config: ProductNewsConfig): Promise<{ claim: Claim | null; waitMs: number }> {
  return withRlsContext({ marketingJob: true }, async () => {
    const db = getDb();
    // Never automatically retry a send whose provider outcome is unknown.
    await db.execute(sql`UPDATE marketing_deliveries SET status='failed',
      error_code='worker_interrupted_outcome_unknown', finished_at=now()
      WHERE status='sending' AND claimed_at < now() - interval '15 minutes'`);
    const control = await db.execute(sql`SELECT
      greatest(0, extract(epoch FROM (next_send_at - now())) * 1000)::int AS wait_ms
      FROM marketing_dispatch_control WHERE id=1 FOR UPDATE`);
    const waitMs = Number(control[0]?.wait_ms ?? 0);
    if (waitMs > 0) return { claim: null, waitMs };
    const rows = await db.execute(sql`SELECT d.id,d.subscriber_id,d.campaign_id,d.kind,
      c.subject_en,c.subject_fr,c.body_en,c.body_fr
      FROM marketing_deliveries d JOIN marketing_campaigns c ON c.id=d.campaign_id
      WHERE d.status='queued'
        AND ((d.kind='campaign' AND c.status='released')
          OR (d.kind='test' AND c.status IN ('approved','released')))
      ORDER BY CASE WHEN d.kind='test' THEN 0 ELSE 1 END,d.queued_at
      LIMIT 1 FOR UPDATE OF d SKIP LOCKED`);
    const candidate = rows[0] as Candidate | undefined;
    if (!candidate) {
      await db.execute(sql`UPDATE marketing_campaigns c SET status='completed',completed_at=now()
        WHERE c.status='released' AND NOT EXISTS (SELECT 1 FROM marketing_deliveries d
          WHERE d.campaign_id=c.id AND d.kind='campaign' AND d.status IN ('queued','sending'))`);
      return { claim: null, waitMs: 0 };
    }
    const people = await db.execute(sql`SELECT id,email,locale,status FROM marketing_subscribers
      WHERE id=${candidate.subscriber_id} FOR UPDATE`);
    const person = people[0] as Subscriber | undefined;
    if (!person || person.status !== "confirmed") {
      await db.execute(sql`UPDATE marketing_deliveries SET status='suppressed',
        error_code='consent_not_current',finished_at=now() WHERE id=${candidate.id}`);
      return { claim: null, waitMs: 0 };
    }
    const expiresAt = new Date(Date.now() + UNSUBSCRIBE_LINK_DAYS * 24 * 60 * 60_000);
    const link = createProductNewsToken("unsubscribe", expiresAt, config.tokenKeys);
    const inserted = await db.execute(sql`SELECT public.marketing_issue_delivery_token(
      ${person.id}, ${link.id}, ${link.hash}, ${expiresAt}
    ) AS issued`);
    if (!inserted[0]?.issued) throw new Error("Could not issue durable unsubscribe link");
    await db.execute(sql`UPDATE marketing_deliveries SET status='sending',
      claimed_at=now(),attempt_count=attempt_count+1 WHERE id=${candidate.id}`);
    await db.execute(sql`UPDATE marketing_dispatch_control SET
      next_send_at=now() + (${sendIntervalMs()} * interval '1 millisecond') WHERE id=1`);
    return {
      claim: {
        id: candidate.id, subscriberId: person.id, campaignId: candidate.campaign_id,
        kind: candidate.kind, email: person.email, locale: person.locale,
        subject: person.locale === "fr" ? candidate.subject_fr : candidate.subject_en,
        body: person.locale === "fr" ? candidate.body_fr : candidate.body_en,
        token: link.token,
      },
      waitMs: 0,
    };
  });
}

async function sendClaim(claim: Claim, config: ProductNewsConfig): Promise<"accepted" | "failed" | "suppressed" | "deferred"> {
  return withRlsContext({ marketingJob: true }, async () => {
    const db = getDb();
    // Lock consent across the actual provider request. Unsubscribe waits for
    // this send to finish, and no send can start after suppression commits.
    const people = await db.execute(sql`SELECT status FROM marketing_subscribers
      WHERE id=${claim.subscriberId} FOR UPDATE`);
    const delivery = await db.execute(sql`SELECT status FROM marketing_deliveries
      WHERE id=${claim.id} FOR UPDATE`);
    const campaign = await db.execute(sql`SELECT status FROM marketing_campaigns
      WHERE id=${claim.campaignId}`);
    const allowedCampaign = claim.kind === "test"
      ? ["approved", "released"].includes(String(campaign[0]?.status))
      : campaign[0]?.status === "released";
    if (delivery[0]?.status === "sending" && people[0]?.status === "confirmed"
      && campaign[0]?.status === "paused" && claim.kind === "campaign") {
      await db.execute(sql`UPDATE marketing_deliveries SET status='queued',
        claimed_at=NULL,error_code=NULL WHERE id=${claim.id}`);
      return "deferred";
    }
    if (people[0]?.status !== "confirmed" || delivery[0]?.status !== "sending" || !allowedCampaign) {
      await db.execute(sql`UPDATE marketing_deliveries SET status='suppressed',
        error_code='consent_or_release_changed',finished_at=now() WHERE id=${claim.id}`);
      return "suppressed";
    }
    if (!config.baseUrl || !config.senderName || !config.senderEmail || !config.contactEmail || !config.mailingAddress) {
      throw new Error("Product-news sender identity is incomplete");
    }
    const unsubscribeUrl = `${config.baseUrl}/${claim.locale}/email-preferences/unsubscribe?token=${encodeURIComponent(claim.token)}`;
    const footer = claim.locale === "fr"
      ? `\n\nEnvoyé par : ${config.senderName}\nAdresse postale : ${config.mailingAddress}\nContact : ${config.contactEmail}\nSe désabonner : ${unsubscribeUrl}`
      : `\n\nSent by: ${config.senderName}\nMailing address: ${config.mailingAddress}\nContact: ${config.contactEmail}\nUnsubscribe: ${unsubscribeUrl}`;
    const result = await sendClassifiedEmail({
      classification: "marketing",
      to: claim.email,
      from: `${config.senderName} <${config.senderEmail}>`,
      replyTo: config.contactEmail,
      listUnsubscribe: unsubscribeUrl,
      subject: claim.kind === "test" ? `[TEST] ${claim.subject}` : claim.subject,
      text: claim.body + footer,
    });
    await db.execute(sql`UPDATE marketing_deliveries SET
      status=${result.ok ? "accepted" : "failed"},
      provider_message_id=${result.ok ? result.messageId ?? null : null},
      error_code=${result.ok ? null : result.reason},
      finished_at=now() WHERE id=${claim.id}`);
    if (claim.kind === "campaign") {
      await db.execute(sql`UPDATE marketing_campaigns SET status='completed',completed_at=now()
        WHERE id=${claim.campaignId} AND status='released'
        AND NOT EXISTS (SELECT 1 FROM marketing_deliveries
          WHERE campaign_id=${claim.campaignId} AND kind='campaign'
            AND status IN ('queued','sending'))`);
    }
    return result.ok ? "accepted" : "failed";
  });
}

export async function dispatchProductNewsBatch(): Promise<{
  accepted: number; failed: number; suppressed: number; deferred: number; rateLimited: boolean;
}> {
  const config = readProductNewsConfig();
  if (!config.enabled) throw new Error(`Product news is unavailable: ${config.reason}`);
  await withRlsContext({ marketingJob: true }, async () => {
    await getDb().execute(sql`SELECT * FROM public.marketing_cleanup_transient()`);
  });
  const counts = { accepted: 0, failed: 0, suppressed: 0, deferred: 0, rateLimited: false };
  for (let index = 0; index < 3; index += 1) {
    const { claim, waitMs } = await claimNext(config);
    if (!claim) {
      if (waitMs > 0 && waitMs <= 3500 && index < 2) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      counts.rateLimited = waitMs > 0;
      break;
    }
    const outcome = await sendClaim(claim, config);
    counts[outcome] += 1;
  }
  return counts;
}
