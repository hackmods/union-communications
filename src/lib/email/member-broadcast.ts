import { randomUUID } from "node:crypto";
import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import { localMemberships } from "@/lib/db/schema/organization-access";
import {
  memberBroadcastCampaigns,
  memberBroadcastConsents,
} from "@/lib/db/schema/member-broadcast";
import { users } from "@/lib/db/schema/tenant";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import { MEMBER_BROADCAST_NOTICE_VERSION } from "@/lib/email/member-broadcast-notice";
import { composeMarketingCampaignEmail } from "@/lib/email/engine";
import { resolveOpenTracking } from "@/lib/email/tracking";
import { sendClassifiedEmail } from "@/lib/email/send";
import { resolveHostBrandWithOverlay } from "@/lib/brand/host-brand-overlay";

export type BroadcastRosterRow = {
  userId: string;
  name: string;
  email: string;
  status: "confirmed" | "revoked" | "none";
};

export async function listBroadcastRoster(input: {
  unionId: string;
  localId: string;
  rls: RlsSessionContext;
}): Promise<BroadcastRosterRow[]> {
  if (!isPostgresConfigured()) return [];
  const now = new Date();
  return withRlsContext(input.rls, async () => {
    const members = await getDb()
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
      })
      .from(localMemberships)
      .innerJoin(users, eq(users.id, localMemberships.userId))
      .where(
        and(
          eq(localMemberships.unionId, input.unionId),
          eq(localMemberships.localId, input.localId),
          eq(localMemberships.status, "active"),
          isNull(localMemberships.endedAt),
          lte(localMemberships.startedAt, now),
          eq(users.unionId, input.unionId),
          isNull(users.archivedAt),
          isNull(users.lockedAt),
        ),
      )
      .orderBy(users.name);

    const consents = await getDb()
      .select({
        userId: memberBroadcastConsents.userId,
        status: memberBroadcastConsents.status,
        email: memberBroadcastConsents.email,
      })
      .from(memberBroadcastConsents)
      .where(
        and(
          eq(memberBroadcastConsents.unionId, input.unionId),
          eq(memberBroadcastConsents.localId, input.localId),
        ),
      );

    const byUser = new Map(consents.map((c) => [c.userId, c]));
    return members.map((m) => {
      const c = byUser.get(m.userId);
      return {
        userId: m.userId,
        name: m.name,
        email: c?.email ?? m.email,
        status: (c?.status as "confirmed" | "revoked" | undefined) ?? "none",
      };
    });
  });
}

export async function setOwnBroadcastConsent(input: {
  unionId: string;
  localId: string;
  userId: string;
  email: string;
  consent: boolean;
  rls: RlsSessionContext;
}): Promise<"ok" | "unavailable"> {
  if (!isPostgresConfigured()) return "unavailable";
  const gate = await assertEnterpriseEmailCapability(
    "member_broadcast",
    input.unionId,
  );
  if (!gate.ok) return "unavailable";

  await withRlsContext(input.rls, async () => {
    const existing = await getDb()
      .select({ id: memberBroadcastConsents.id })
      .from(memberBroadcastConsents)
      .where(
        and(
          eq(memberBroadcastConsents.userId, input.userId),
          eq(memberBroadcastConsents.localId, input.localId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await getDb()
        .update(memberBroadcastConsents)
        .set(
          input.consent
            ? {
                status: "confirmed",
                email: input.email.toLowerCase(),
                wordingVersion: MEMBER_BROADCAST_NOTICE_VERSION,
                consentedAt: new Date(),
                revokedAt: null,
              }
            : {
                status: "revoked",
                email: input.email.toLowerCase(),
                wordingVersion: MEMBER_BROADCAST_NOTICE_VERSION,
                revokedAt: new Date(),
              },
        )
        .where(eq(memberBroadcastConsents.id, existing[0].id));
    } else if (input.consent) {
      await getDb().insert(memberBroadcastConsents).values({
        id: randomUUID(),
        unionId: input.unionId,
        localId: input.localId,
        userId: input.userId,
        email: input.email.toLowerCase(),
        status: "confirmed",
        wordingVersion: MEMBER_BROADCAST_NOTICE_VERSION,
      });
    }
  });
  return "ok";
}

export async function sendMemberBroadcast(input: {
  unionId: string;
  localId: string;
  actorUserId: string;
  subject: string;
  body: string;
  recipientUserIds: string[];
  explicitTrackingOptIn: boolean;
  locale: "en" | "fr";
  rls: RlsSessionContext;
  from: string;
  replyTo: string;
  listUnsubscribeBase: string;
}): Promise<
  | {
      ok: true;
      campaignId: string;
      accepted: number;
      failed: number;
      trackingApplied: boolean;
    }
  | { ok: false; reason: string }
> {
  const gate = await assertEnterpriseEmailCapability(
    "member_broadcast",
    input.unionId,
  );
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const tracking = await resolveOpenTracking({
    unionId: input.unionId,
    explicitOptIn: input.explicitTrackingOptIn,
  });

  const roster = await listBroadcastRoster({
    unionId: input.unionId,
    localId: input.localId,
    rls: input.rls,
  });
  const allowed = new Set(
    roster.filter((r) => r.status === "confirmed").map((r) => r.userId),
  );
  const recipients = roster.filter(
    (r) =>
      input.recipientUserIds.includes(r.userId) && allowed.has(r.userId),
  );
  if (recipients.length === 0) {
    return { ok: false, reason: "no_consented_recipients" };
  }

  const brand = resolveHostBrandWithOverlay();
  const campaignId = randomUUID();
  let accepted = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const unsubscribeUrl = `${input.listUnsubscribeBase}?user=${encodeURIComponent(recipient.userId)}`;
    const artifact = composeMarketingCampaignEmail({
      locale: input.locale,
      subject: input.subject,
      body: input.body,
      senderName: brand.subText || "UnionOps",
      mailingAddress: "See your local officers for postal contact.",
      contactEmail: input.replyTo,
      unsubscribeUrl,
    });
    const result = await sendClassifiedEmail({
      classification: "broadcast",
      to: recipient.email,
      from: input.from,
      replyTo: input.replyTo,
      listUnsubscribe: unsubscribeUrl,
      subject: artifact.subject,
      text: artifact.text,
      html: artifact.html,
      openTracking: tracking.apply,
    });
    if (result.ok) accepted += 1;
    else failed += 1;
  }

  await withRlsContext(input.rls, async () => {
    await getDb().insert(memberBroadcastCampaigns).values({
      id: campaignId,
      unionId: input.unionId,
      localId: input.localId,
      createdById: input.actorUserId,
      subject: input.subject,
      bodyText: input.body,
      openTrackingRequested: input.explicitTrackingOptIn ? "yes" : "no",
      openTrackingApplied: tracking.apply ? "yes" : "no",
      recipientCount: String(recipients.length),
      acceptedCount: String(accepted),
      failedCount: String(failed),
    });
  });

  return {
    ok: true,
    campaignId,
    accepted,
    failed,
    trackingApplied: tracking.apply,
  };
}
