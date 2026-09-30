import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { parseVerifiedProductNewsWebhook } from "@/lib/email/mailgun-product-news-webhook";

/** Mailgun feedback for product-news, member-broadcast, and outreach lists (tag-discriminated). */
export async function POST(request: Request) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY?.trim();
  if (!signingKey || !isPostgresConfigured()) {
    return Response.json({ error: "Unavailable" }, { status: 503 });
  }
  const raw = await request.text();
  if (raw.length > 100_000) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const verified = parseVerifiedProductNewsWebhook(body, signingKey);
  if (!verified.authenticated) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (!verified.event || !verified.lane) {
    return Response.json(
      { ok: true, ignored: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const event = verified.event;
  try {
    const rows = await withRlsContext({ marketingJob: true }, () => {
      if (verified.lane === "member_broadcast") {
        return getDb().execute(sql`
          SELECT public.member_broadcast_record_provider_event(
            ${event.id}, ${event.messageId}, ${event.type}, ${randomUUID()}
          ) AS recorded`);
      }
      if (verified.lane === "outreach_list") {
        return getDb().execute(sql`
          SELECT public.outreach_record_provider_event(
            ${event.id}, ${event.messageId}, ${event.type}, ${randomUUID()}
          ) AS recorded`);
      }
      return getDb().execute(sql`
        SELECT public.marketing_record_provider_event(
          ${event.id}, ${event.messageId}, ${event.type}, ${randomUUID()}
        ) AS recorded`);
    });
    if (!rows[0]?.recorded) {
      return Response.json(
        { error: "Delivery not yet correlated" },
        { status: 503 },
      );
    }
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Could not record provider event" },
      { status: 503 },
    );
  }
}
