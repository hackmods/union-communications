import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { marketingConsentEvents, marketingDeliveries, marketingSubscribers } from "@/lib/db/schema";
import { authorizeProductNewsAdmin, productNewsJson } from "@/lib/email/product-news-admin";
import { marketingEmailLookupKey } from "@/lib/email/marketing-consent";

async function readEvidence(email: unknown, exportCsv: boolean) {
  const authorization = await authorizeProductNewsAdmin();
  if (!authorization.ok) return authorization.response;
  const lookup = marketingEmailLookupKey(email);
  if (!lookup) return productNewsJson({ error: "Enter one valid address." }, { status: 400 });
  const { requestId, responseHeaders } = createAuditRequestContext();
  try {
    return await withRlsContext(authorization.access.rlsContext, async () => {
      const db = getDb();
      const [subscriber] = await db.select().from(marketingSubscribers)
        .where(eq(marketingSubscribers.lookupKey, lookup)).limit(1);
      const events = subscriber ? await db.select().from(marketingConsentEvents)
        .where(eq(marketingConsentEvents.subscriberId, subscriber.id)).orderBy(marketingConsentEvents.sequence) : [];
      const deliveries = subscriber ? await db.select({
        campaignId: marketingDeliveries.campaignId,
        kind: marketingDeliveries.kind,
        status: marketingDeliveries.status,
        queuedAt: marketingDeliveries.queuedAt,
        finishedAt: marketingDeliveries.finishedAt,
        providerMessageId: marketingDeliveries.providerMessageId,
      }).from(marketingDeliveries).where(eq(marketingDeliveries.subscriberId, subscriber.id)) : [];
      await auditLog.log({
        userId: authorization.access.actorId,
        action: exportCsv ? "marketing.consent.export" : "marketing.consent.view",
        resourceType: "marketing_subscriber",
        resourceId: subscriber?.id ?? "not_found",
        metadata: { requestId, found: String(Boolean(subscriber)) },
      });
      if (!exportCsv) return productNewsJson({ subscriber, events, deliveries }, { headers: responseHeaders() });
      const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const lines = [
        ["record_type","sequence","destination_email","locale","event_type","occurred_at","wording_version","wording_text","source","grant_event_id","reason","campaign_id","delivery_status"].map(quote).join(","),
        ...events.map((event) => ["consent",event.sequence,event.destinationEmail,event.locale,event.eventType,event.occurredAt.toISOString(),event.wordingVersion,event.wordingText,event.source,event.grantEventId,event.reason,"",""].map(quote).join(",")),
        ...deliveries.map((delivery) => ["delivery","","","","",delivery.finishedAt?.toISOString() ?? delivery.queuedAt.toISOString(),"","","","","",delivery.campaignId,delivery.status].map(quote).join(",")),
      ];
      const headers = responseHeaders({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=product-news-consent.csv", "Cache-Control": "private, no-store" });
      return new Response(lines.join("\r\n"), { headers });
    });
  } catch {
    return productNewsJson({ error: "Could not load the consent history." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: { action?: unknown; email?: unknown; reason?: unknown };
  try { body = await request.json() as { action?: unknown; email?: unknown; reason?: unknown }; }
  catch { return productNewsJson({ error: "Invalid request." }, { status: 400 }); }
  if (body.action === "search" || body.action === "export") {
    return readEvidence(body.email, body.action === "export");
  }
  if (body.action !== "correct") return productNewsJson({ error: "Unsupported action." }, { status: 400 });
  const authorization = await authorizeProductNewsAdmin();
  if (!authorization.ok) return authorization.response;
  const lookup = marketingEmailLookupKey(body.email);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!lookup || reason.length < 8 || reason.length > 1000) {
    return productNewsJson({ error: "Enter an address and a specific correction reason." }, { status: 400 });
  }
  const { requestId, responseHeaders } = createAuditRequestContext();
  try {
    return await withRlsContext(authorization.access.rlsContext, async () => {
      const rows = await getDb().execute(sql`SELECT public.marketing_admin_suppress(
        ${lookup}, ${reason}, ${authorization.access.actorId}, ${randomUUID()}, ${requestId}
      ) AS corrected`);
      const corrected = Boolean(rows[0]?.corrected);
      await auditLog.log({ userId: authorization.access.actorId,
        action: corrected ? "marketing.consent.admin_correction" : "marketing.consent.admin_correction_denied",
        resourceType: "marketing_subscriber", resourceId: "exact_address",
        metadata: { requestId, corrected: String(corrected) } });
      return productNewsJson({ ok: corrected }, { status: corrected ? 200 : 404, headers: responseHeaders() });
    });
  } catch {
    return productNewsJson({ error: "Could not record the correction." }, { status: 503 });
  }
}
