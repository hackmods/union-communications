import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { marketingCampaigns, marketingDeliveries, marketingSubscribers } from "@/lib/db/schema";
import { authorizeProductNewsAdmin, productNewsJson } from "@/lib/email/product-news-admin";
import { marketingEmailLookupKey } from "@/lib/email/marketing-consent";
import { readProductNewsConfig } from "@/lib/email/product-news-config";

const draftSchema = z.object({
  action: z.literal("create"),
  subjectEn: z.string().trim().min(4).max(180),
  subjectFr: z.string().trim().min(4).max(180),
  bodyEn: z.string().trim().min(20).max(12000),
  bodyFr: z.string().trim().min(20).max(12000),
});
const actionSchema = z.discriminatedUnion("action", [
  draftSchema,
  z.object({ action: z.literal("approve"), campaignId: z.string().uuid(), approvalReference: z.string().trim().min(8).max(300) }),
  z.object({ action: z.literal("release"), campaignId: z.string().uuid(), confirmRelease: z.literal(true) }),
  z.object({ action: z.enum(["pause", "resume"]), campaignId: z.string().uuid() }),
  z.object({ action: z.literal("test"), campaignId: z.string().uuid(), email: z.string().email().max(254) }),
]);

export async function GET() {
  const authorization = await authorizeProductNewsAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    return await withRlsContext(authorization.access.rlsContext, async () => {
      const db = getDb();
      const campaigns = await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt)).limit(50);
      const counts = await db.execute(sql`SELECT
        (SELECT count(*)::int FROM marketing_subscribers WHERE status='confirmed') AS confirmed,
        (SELECT count(*)::int FROM marketing_subscribers WHERE status='confirmed' AND locale='en') AS confirmed_en,
        (SELECT count(*)::int FROM marketing_subscribers WHERE status='confirmed' AND locale='fr') AS confirmed_fr,
        (SELECT count(*)::int FROM marketing_subscribers WHERE status='pending_confirmation') AS pending,
        (SELECT count(*)::int FROM marketing_subscribers WHERE status='suppressed') AS suppressed`);
      const deliveries = await db.execute(sql`SELECT campaign_id, kind, status, error_code, count(*)::int AS count
        FROM marketing_deliveries GROUP BY campaign_id, kind, status, error_code`);
      const providerEvents = await db.execute(sql`SELECT event_type,count(*)::int AS count
        FROM marketing_provider_events GROUP BY event_type`);
      const config = readProductNewsConfig();
      return productNewsJson({
        campaigns, counts: counts[0], deliveries, providerEvents,
        sending: { enabled: config.enabled, reason: config.reason, noticeVersion: process.env.UNIONOPS_PRODUCT_NEWS_APPROVED_VERSION ?? null },
      });
    });
  } catch {
    return productNewsJson({ error: "Could not load product-news operations." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeProductNewsAdmin();
  if (!authorization.ok) return authorization.response;
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return productNewsJson({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return productNewsJson({ error: "Check the campaign fields." }, { status: 400 });
  const input = parsed.data;
  const { requestId, responseHeaders } = createAuditRequestContext();
  const actorId = authorization.access.actorId;
  try {
    return await withRlsContext(authorization.access.rlsContext, async () => {
      const db = getDb();
      if (input.action === "create") {
        const id = randomUUID();
        await db.insert(marketingCampaigns).values({
          id, subjectEn: input.subjectEn, subjectFr: input.subjectFr,
          bodyEn: input.bodyEn, bodyFr: input.bodyFr, createdBy: actorId,
          status: "draft",
        });
        await auditLog.log({ userId: actorId, action: "marketing.campaign.created", resourceType: "marketing_campaign", resourceId: id,
          metadata: { requestId } });
        return productNewsJson({ ok: true, campaignId: id }, { status: 201, headers: responseHeaders() });
      }
      const [campaign] = await db.select().from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, input.campaignId)).for("update").limit(1);
      if (!campaign) return productNewsJson({ error: "Campaign not found." }, { status: 404 });
      if (input.action === "approve") {
        if (campaign.status !== "draft") return productNewsJson({ error: "Only a draft can be approved." }, { status: 409 });
        await db.update(marketingCampaigns).set({
          status: "approved", approvalReference: input.approvalReference,
          approvedBy: actorId, approvedAt: new Date(),
        }).where(eq(marketingCampaigns.id, campaign.id));
      } else if (input.action === "release") {
        if (!readProductNewsConfig().enabled) return productNewsJson({ error: "Product-news sending is not configured and approved." }, { status: 503 });
        if (campaign.status !== "approved" || !campaign.approvalReference || !campaign.approvedAt) {
          return productNewsJson({ error: "Approve the exact bilingual template before release." }, { status: 409 });
        }
        await db.execute(sql`INSERT INTO marketing_deliveries (id,campaign_id,subscriber_id,kind,status)
          SELECT gen_random_uuid()::text, ${campaign.id}, id, 'campaign', 'queued'
          FROM marketing_subscribers WHERE status='confirmed'
          ON CONFLICT (campaign_id,subscriber_id,kind) DO NOTHING`);
        await db.update(marketingCampaigns).set({ status: "released", releasedBy: actorId, releasedAt: new Date() })
          .where(eq(marketingCampaigns.id, campaign.id));
      } else if (input.action === "pause") {
        if (campaign.status !== "released") return productNewsJson({ error: "Only a released campaign can be paused." }, { status: 409 });
        await db.update(marketingCampaigns).set({ status: "paused" }).where(eq(marketingCampaigns.id, campaign.id));
      } else if (input.action === "resume") {
        if (campaign.status !== "paused") return productNewsJson({ error: "Only a paused campaign can resume." }, { status: 409 });
        if (!readProductNewsConfig().enabled) return productNewsJson({ error: "Product-news sending is unavailable." }, { status: 503 });
        await db.update(marketingCampaigns).set({ status: "released" }).where(eq(marketingCampaigns.id, campaign.id));
      } else if (input.action === "test") {
        if (campaign.status !== "approved") return productNewsJson({ error: "Approve the campaign before a test send." }, { status: 409 });
        if (!readProductNewsConfig().enabled) return productNewsJson({ error: "Product-news sending is unavailable." }, { status: 503 });
        const lookup = marketingEmailLookupKey(input.email);
        if (!lookup) return productNewsJson({ error: "Enter a valid subscribed address." }, { status: 400 });
        const [subscriber] = await db.select({ id: marketingSubscribers.id }).from(marketingSubscribers)
          .where(and(eq(marketingSubscribers.lookupKey, lookup), eq(marketingSubscribers.status, "confirmed"))).limit(1);
        if (!subscriber) return productNewsJson({ error: "The test address must be a confirmed product-news subscriber." }, { status: 409 });
        const queued = await db.insert(marketingDeliveries).values({
          id: randomUUID(), campaignId: campaign.id, subscriberId: subscriber.id, kind: "test", status: "queued",
        }).onConflictDoNothing().returning({ id: marketingDeliveries.id });
        if (!queued.length) return productNewsJson({ error: "This address has already received this campaign test." }, { status: 409 });
      }
      await auditLog.log({ userId: actorId, action: `marketing.campaign.${input.action}`, resourceType: "marketing_campaign", resourceId: campaign.id,
        metadata: { requestId } });
      return productNewsJson({ ok: true, campaignId: campaign.id }, { headers: responseHeaders() });
    });
  } catch {
    return productNewsJson({ error: "Could not update the campaign." }, { status: 503 });
  }
}
