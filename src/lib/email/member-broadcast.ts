import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import { localMemberships } from "@/lib/db/schema/organization-access";
import {
  memberBroadcastActionTokens,
  memberBroadcastCampaigns,
  memberBroadcastConsents,
  memberBroadcastDeliveries,
  memberBroadcastSuppressions,
} from "@/lib/db/schema/member-broadcast";
import { users } from "@/lib/db/schema/tenant";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import {
  MEMBER_BROADCAST_UNSUBSCRIBE_LINK_DAYS,
  createMemberBroadcastToken,
  readMemberBroadcastTokenKeys,
} from "@/lib/email/member-broadcast-config";
import { MEMBER_BROADCAST_NOTICE_VERSION } from "@/lib/email/member-broadcast-notice";
import { composeMarketingCampaignEmail } from "@/lib/email/engine";
import { resolveOpenTracking } from "@/lib/email/tracking";
import { sendClassifiedEmail } from "@/lib/email/send";
import { resolveHostBrandWithOverlay } from "@/lib/brand/host-brand-overlay";

export type BroadcastRosterRow = {
  userId: string;
  name: string;
  email: string;
  status: "confirmed" | "revoked" | "none" | "stale";
};

export type BroadcastCampaignRow = {
  id: string;
  subject: string;
  recipientCount: number;
  acceptedCount: number;
  failedCount: number;
  createdAt: string;
  openTrackingApplied: boolean;
};

function isSendEligible(
  consent:
    | { status: string; wordingVersion: string }
    | undefined,
  suppressed: boolean,
): BroadcastRosterRow["status"] {
  if (suppressed) return "revoked";
  if (!consent || consent.status !== "confirmed") {
    return consent?.status === "revoked" ? "revoked" : "none";
  }
  if (consent.wordingVersion !== MEMBER_BROADCAST_NOTICE_VERSION) {
    return "stale";
  }
  return "confirmed";
}

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
        wordingVersion: memberBroadcastConsents.wordingVersion,
      })
      .from(memberBroadcastConsents)
      .where(
        and(
          eq(memberBroadcastConsents.unionId, input.unionId),
          eq(memberBroadcastConsents.localId, input.localId),
        ),
      );

    const suppressions = await getDb()
      .select({ userId: memberBroadcastSuppressions.userId })
      .from(memberBroadcastSuppressions)
      .where(
        and(
          eq(memberBroadcastSuppressions.unionId, input.unionId),
          eq(memberBroadcastSuppressions.localId, input.localId),
        ),
      );

    const byUser = new Map(consents.map((c) => [c.userId, c]));
    const suppressedUsers = new Set(suppressions.map((s) => s.userId));
    return members.map((m) => {
      const c = byUser.get(m.userId);
      const status = isSendEligible(c, suppressedUsers.has(m.userId));
      return {
        userId: m.userId,
        name: m.name,
        email: c?.email ?? m.email,
        status,
      };
    });
  });
}

export async function listBroadcastCampaigns(input: {
  unionId: string;
  localId: string;
  rls: RlsSessionContext;
  limit?: number;
}): Promise<BroadcastCampaignRow[]> {
  if (!isPostgresConfigured()) return [];
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  return withRlsContext(input.rls, async () => {
    const rows = await getDb()
      .select({
        id: memberBroadcastCampaigns.id,
        subject: memberBroadcastCampaigns.subject,
        recipientCount: memberBroadcastCampaigns.recipientCount,
        acceptedCount: memberBroadcastCampaigns.acceptedCount,
        failedCount: memberBroadcastCampaigns.failedCount,
        createdAt: memberBroadcastCampaigns.createdAt,
        openTrackingApplied: memberBroadcastCampaigns.openTrackingApplied,
      })
      .from(memberBroadcastCampaigns)
      .where(
        and(
          eq(memberBroadcastCampaigns.unionId, input.unionId),
          eq(memberBroadcastCampaigns.localId, input.localId),
        ),
      )
      .orderBy(desc(memberBroadcastCampaigns.createdAt))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      recipientCount: Number(row.recipientCount) || 0,
      acceptedCount: Number(row.acceptedCount) || 0,
      failedCount: Number(row.failedCount) || 0,
      createdAt: row.createdAt.toISOString(),
      openTrackingApplied: row.openTrackingApplied === "yes",
    }));
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

    if (input.consent) {
      await getDb()
        .delete(memberBroadcastSuppressions)
        .where(
          and(
            eq(memberBroadcastSuppressions.unionId, input.unionId),
            eq(memberBroadcastSuppressions.localId, input.localId),
            eq(memberBroadcastSuppressions.userId, input.userId),
          ),
        );
    }

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
      if (!input.consent) {
        await getDb()
          .insert(memberBroadcastSuppressions)
          .values({
            id: randomUUID(),
            unionId: input.unionId,
            localId: input.localId,
            userId: input.userId,
            email: input.email.toLowerCase(),
            reason: "member_withdrawal",
            source: "hub_consent",
          })
          .onConflictDoUpdate({
            target: [
              memberBroadcastSuppressions.unionId,
              memberBroadcastSuppressions.localId,
              memberBroadcastSuppressions.userId,
            ],
            set: {
              email: input.email.toLowerCase(),
              reason: "member_withdrawal",
              source: "hub_consent",
            },
          });
      }
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
    } else {
      await getDb().insert(memberBroadcastSuppressions).values({
        id: randomUUID(),
        unionId: input.unionId,
        localId: input.localId,
        userId: input.userId,
        email: input.email.toLowerCase(),
        reason: "member_withdrawal",
        source: "hub_consent",
      });
      await getDb().insert(memberBroadcastConsents).values({
        id: randomUUID(),
        unionId: input.unionId,
        localId: input.localId,
        userId: input.userId,
        email: input.email.toLowerCase(),
        status: "revoked",
        wordingVersion: MEMBER_BROADCAST_NOTICE_VERSION,
        revokedAt: new Date(),
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
  unsubscribeApiBase: string;
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

  const tokenKeys = readMemberBroadcastTokenKeys();
  if (!tokenKeys.length || tokenKeys.some((key) => key.length < 32)) {
    return { ok: false, reason: "token_keys_missing" };
  }

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
      acceptedCount: "0",
      failedCount: "0",
    });
  });

  const expiresAt = new Date(
    Date.now() + MEMBER_BROADCAST_UNSUBSCRIBE_LINK_DAYS * 24 * 60 * 60_000,
  );

  for (const recipient of recipients) {
    const link = createMemberBroadcastToken(
      {
        purpose: "unsubscribe",
        expiresAt,
        unionId: input.unionId,
        localId: input.localId,
        userId: recipient.userId,
      },
      tokenKeys,
    );
    const deliveryId = randomUUID();
    await withRlsContext(input.rls, async () => {
      await getDb().insert(memberBroadcastActionTokens).values({
        id: link.id,
        unionId: input.unionId,
        localId: input.localId,
        userId: recipient.userId,
        campaignId,
        tokenHash: link.hash,
        purpose: "unsubscribe",
        expiresAt,
      });
      await getDb().insert(memberBroadcastDeliveries).values({
        id: deliveryId,
        campaignId,
        unionId: input.unionId,
        localId: input.localId,
        userId: recipient.userId,
        destinationEmail: recipient.email.toLowerCase(),
      });
    });

    const unsubscribeUrl = `${input.unsubscribeApiBase}?token=${encodeURIComponent(link.token)}`;
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
      listUnsubscribePost: true,
      subject: artifact.subject,
      text: artifact.text,
      html: artifact.html,
      openTracking: tracking.apply,
    });
    if (result.ok) {
      accepted += 1;
      if (result.messageId) {
        await withRlsContext(input.rls, async () => {
          await getDb()
            .update(memberBroadcastDeliveries)
            .set({ providerMessageId: result.messageId })
            .where(eq(memberBroadcastDeliveries.id, deliveryId));
        });
      }
    } else {
      failed += 1;
      await withRlsContext(input.rls, async () => {
        await getDb()
          .update(memberBroadcastDeliveries)
          .set({
            status: "failed",
            errorCode: "send_failed",
            finishedAt: new Date(),
          })
          .where(eq(memberBroadcastDeliveries.id, deliveryId));
      });
    }
  }

  await withRlsContext(input.rls, async () => {
    await getDb()
      .update(memberBroadcastCampaigns)
      .set({
        acceptedCount: String(accepted),
        failedCount: String(failed),
      })
      .where(eq(memberBroadcastCampaigns.id, campaignId));
  });

  return {
    ok: true,
    campaignId,
    accepted,
    failed,
    trackingApplied: tracking.apply,
  };
}
