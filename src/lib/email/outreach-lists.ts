import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import {
  outreachCampaigns,
  outreachDeliveries,
  outreachLists,
  outreachSubscribers,
  outreachSuppressions,
} from "@/lib/db/schema/outreach";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import { composeMarketingCampaignEmail } from "@/lib/email/engine";
import { OUTREACH_LIST_NOTICE_VERSION } from "@/lib/email/outreach-list-notice";
import { readOutreachListsConfig } from "@/lib/email/outreach-config";
import {
  memoryCreateList,
  memoryGetLists,
  memoryListSubscriberCounts,
} from "@/lib/email/outreach-lists-memory";
import { sendClassifiedEmail } from "@/lib/email/send";
import { slugify } from "@/lib/utils";

export type OutreachListRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "paused";
  confirmedCount: number;
  pendingCount: number;
};

export type OutreachCampaignRow = {
  id: string;
  subject: string;
  status: string;
  recipientCount: number;
  acceptedCount: number;
  failedCount: number;
  createdAt: string;
};

export async function createOutreachList(input: {
  unionId: string;
  createdById: string;
  name: string;
  purpose?: string;
  slug?: string;
  rls: RlsSessionContext;
}): Promise<
  | { ok: true; listId: string; slug: string }
  | { ok: false; reason: "gate_closed" | "invalid_name" | "slug_conflict" }
> {
  const gate = await assertEnterpriseEmailCapability("outreach_lists", input.unionId);
  if (!gate.ok) return { ok: false, reason: "gate_closed" };

  const baseName = input.name.trim();
  if (baseName.length < 2 || baseName.length > 120) {
    return { ok: false, reason: "invalid_name" };
  }
  const purpose = input.purpose?.trim();
  const storedName =
    purpose && purpose.length >= 2 ? `${baseName} — ${purpose.slice(0, 200)}` : baseName;
  let slug = slugify(input.slug?.trim() || baseName);
  if (!slug) slug = slugify(storedName) || "list";

  if (!isPostgresConfigured()) {
    const existing = memoryGetLists(input.unionId).some((l) => l.slug === slug);
    if (existing) return { ok: false, reason: "slug_conflict" };
    const row = memoryCreateList({
      unionId: input.unionId,
      name: storedName,
      slug,
    });
    return { ok: true, listId: row.id, slug: row.slug };
  }

  return withRlsContext(input.rls, async () => {
    const db = getDb();
    let candidate = slug;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [conflict] = await db
        .select({ id: outreachLists.id })
        .from(outreachLists)
        .where(
          and(eq(outreachLists.unionId, input.unionId), eq(outreachLists.slug, candidate)),
        )
        .limit(1);
      if (!conflict) break;
      candidate = `${slug}-${attempt + 2}`;
      if (attempt === 4) return { ok: false, reason: "slug_conflict" };
    }
    const listId = randomUUID();
    await db.insert(outreachLists).values({
      id: listId,
      unionId: input.unionId,
      name: storedName,
      slug: candidate,
      status: "active",
      createdById: input.createdById,
    });
    return { ok: true, listId, slug: candidate };
  });
}

export async function listOutreachLists(input: {
  unionId: string;
  rls: RlsSessionContext;
}): Promise<OutreachListRow[]> {
  if (!isPostgresConfigured()) {
    return memoryGetLists(input.unionId).map((list) => {
      const counts = memoryListSubscriberCounts(list.id);
      return {
        id: list.id,
        name: list.name,
        slug: list.slug,
        status: list.status,
        confirmedCount: counts.confirmed,
        pendingCount: counts.pending,
      };
    });
  }
  return withRlsContext(input.rls, async () => {
    const lists = await getDb()
      .select()
      .from(outreachLists)
      .where(eq(outreachLists.unionId, input.unionId))
      .orderBy(outreachLists.name);
    const rows: OutreachListRow[] = [];
    for (const list of lists) {
      const counts = await getDb().execute(sql`
        SELECT
          count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
          count(*) FILTER (WHERE status = 'pending_confirmation')::int AS pending
        FROM outreach_subscribers
        WHERE list_id = ${list.id}`);
      const confirmed = Number(counts[0]?.confirmed ?? 0);
      const pending = Number(counts[0]?.pending ?? 0);
      rows.push({
        id: list.id,
        name: list.name,
        slug: list.slug,
        status: list.status as "active" | "paused",
        confirmedCount: confirmed,
        pendingCount: pending,
      });
    }
    return rows;
  });
}

export async function listOutreachCampaigns(input: {
  unionId: string;
  listId?: string;
  rls: RlsSessionContext;
}): Promise<OutreachCampaignRow[]> {
  if (!isPostgresConfigured()) return [];
  return withRlsContext(input.rls, async () => {
    const where = input.listId
      ? and(
          eq(outreachCampaigns.unionId, input.unionId),
          eq(outreachCampaigns.listId, input.listId),
        )
      : eq(outreachCampaigns.unionId, input.unionId);
    const campaigns = await getDb()
      .select()
      .from(outreachCampaigns)
      .where(where)
      .orderBy(desc(outreachCampaigns.createdAt))
      .limit(50);
    return campaigns.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status,
      recipientCount: Number(c.recipientCount),
      acceptedCount: Number(c.acceptedCount),
      failedCount: Number(c.failedCount),
      createdAt: c.createdAt.toISOString(),
    }));
  });
}

export async function createOutreachCampaign(input: {
  unionId: string;
  listId: string;
  createdById: string;
  subject: string;
  bodyText: string;
  release: boolean;
  rls: RlsSessionContext;
}): Promise<
  | { ok: true; campaignId: string }
  | { ok: false; reason: "gate_closed" | "list_not_found" | "list_paused" }
> {
  const gate = await assertEnterpriseEmailCapability("outreach_lists", input.unionId);
  if (!gate.ok) return { ok: false, reason: "gate_closed" };
  if (!isPostgresConfigured()) return { ok: false, reason: "gate_closed" };
  const config = readOutreachListsConfig();
  if (!config.enabled) return { ok: false, reason: "gate_closed" };

  return withRlsContext(input.rls, async () => {
    const db = getDb();
    const [list] = await db
      .select()
      .from(outreachLists)
      .where(
        and(eq(outreachLists.id, input.listId), eq(outreachLists.unionId, input.unionId)),
      )
      .limit(1);
    if (!list) return { ok: false, reason: "list_not_found" };
    if (list.status === "paused") return { ok: false, reason: "list_paused" };

    const campaignId = randomUUID();
    const suppressedKeys = await db
      .select({ lookupKey: outreachSuppressions.lookupKey })
      .from(outreachSuppressions)
      .where(eq(outreachSuppressions.unionId, input.unionId));
    const blocked = new Set(suppressedKeys.map((s) => s.lookupKey));

    const confirmed = await db
      .select()
      .from(outreachSubscribers)
      .where(
        and(
          eq(outreachSubscribers.listId, input.listId),
          eq(outreachSubscribers.status, "confirmed"),
          eq(outreachSubscribers.wordingVersion, OUTREACH_LIST_NOTICE_VERSION),
        ),
      );
    const recipients = confirmed.filter((s) => !blocked.has(s.lookupKey));

    await db.insert(outreachCampaigns).values({
      id: campaignId,
      unionId: input.unionId,
      listId: input.listId,
      createdById: input.createdById,
      subject: input.subject,
      bodyText: input.bodyText,
      status: input.release ? "released" : "draft",
      approvalReference: config.approvalReference,
      recipientCount: String(recipients.length),
      releasedAt: input.release ? new Date() : null,
    });

    if (input.release && recipients.length) {
      await db.insert(outreachDeliveries).values(
        recipients.map((sub) => ({
          id: randomUUID(),
          campaignId,
          unionId: input.unionId,
          subscriberId: sub.id,
          destinationEmail: sub.email,
          status: "queued" as const,
        })),
      );
    }

    return { ok: true, campaignId };
  });
}

const BATCH_SIZE = 3;

export async function dispatchOutreachBatch(): Promise<{ sent: number }> {
  if (!isPostgresConfigured() || !readOutreachListsConfig().enabled) {
    return { sent: 0 };
  }
  const config = readOutreachListsConfig();
  let sent = 0;
  await withRlsContext({ marketingJob: true }, async () => {
    const db = getDb();
    const queue = await db
      .select({
        delivery: outreachDeliveries,
        campaign: outreachCampaigns,
        subscriber: outreachSubscribers,
        list: outreachLists,
      })
      .from(outreachDeliveries)
      .innerJoin(
        outreachCampaigns,
        eq(outreachCampaigns.id, outreachDeliveries.campaignId),
      )
      .innerJoin(
        outreachSubscribers,
        eq(outreachSubscribers.id, outreachDeliveries.subscriberId),
      )
      .innerJoin(outreachLists, eq(outreachLists.id, outreachCampaigns.listId))
      .where(
        and(
          eq(outreachDeliveries.status, "queued"),
          eq(outreachCampaigns.status, "released"),
          eq(outreachLists.status, "active"),
        ),
      )
      .limit(BATCH_SIZE);

    for (const row of queue) {
      const { delivery, campaign, subscriber } = row;
      if (subscriber.status !== "confirmed") {
        await db
          .update(outreachDeliveries)
          .set({ status: "suppressed", errorCode: "consent_stale", finishedAt: new Date() })
          .where(eq(outreachDeliveries.id, delivery.id));
        continue;
      }
      const locale = subscriber.locale;
      const unsubscribeUrl = config.baseUrl
        ? `${config.baseUrl}/api/outreach-lists/unsubscribe?list=${campaign.listId}`
        : "";
      const artifact = composeMarketingCampaignEmail({
        locale,
        subject: campaign.subject,
        body: campaign.bodyText,
        senderName: config.senderName ?? "Union",
        mailingAddress: config.mailingAddress ?? "",
        contactEmail: config.contactEmail ?? config.senderEmail ?? "",
        unsubscribeUrl,
      });
      const from = `${config.senderName} <${config.senderEmail}>`;
      const result = await sendClassifiedEmail({
        classification: "list_campaign",
        to: delivery.destinationEmail,
        subject: artifact.subject,
        text: artifact.text,
        html: artifact.html,
        from,
        replyTo: config.contactEmail ?? config.senderEmail ?? undefined,
        listUnsubscribe: unsubscribeUrl || undefined,
        listUnsubscribePost: Boolean(unsubscribeUrl),
      });
      if (!result.ok) {
        await db
          .update(outreachDeliveries)
          .set({
            status: "failed",
            errorCode: result.reason,
            finishedAt: new Date(),
          })
          .where(eq(outreachDeliveries.id, delivery.id));
        continue;
      }
      await db
        .update(outreachDeliveries)
        .set({
          status: "accepted",
          providerMessageId: result.messageId ?? null,
          finishedAt: new Date(),
        })
        .where(eq(outreachDeliveries.id, delivery.id));
      sent += 1;
    }
  });
  return { sent };
}
