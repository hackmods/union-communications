import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { emailAppBaseUrl } from "@/lib/email/messages";
import {
  listBroadcastCampaigns,
  listBroadcastRoster,
  MEMBER_BROADCAST_MAX_RECIPIENTS_PER_SEND,
  sendMemberBroadcast,
  setOwnBroadcastConsent,
} from "@/lib/email/member-broadcast";
import { MEMBER_BROADCAST_NOTICE } from "@/lib/email/member-broadcast-notice";
import { readSmtpEnv } from "@/lib/email/send";
import type { UserRole } from "@/types/tenant";

export const dynamic = "force-dynamic";

function canManageBroadcast(roles: UserRole[]): boolean {
  return roles.some((r) =>
    ["platform_admin", "union_admin", "local_president", "local_exec"].includes(
      r,
    ),
  );
}

async function requireBroadcastSession() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false as const, status: 403 as const, error: "MFA required" };
  }
  if (!session.user.unionId || !session.user.localId) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Union and local required",
    };
  }
  return {
    ok: true as const,
    session,
    unionId: session.user.unionId,
    localId: session.user.localId,
  };
}

export async function GET() {
  const gate = await requireBroadcastSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const roles = (gate.session.user.roles ?? []) as UserRole[];
  const rls = {
    userId: gate.session.user.id,
    unionId: gate.unionId,
    localId: gate.localId,
    mfaVerified: true,
  };

  if (canManageBroadcast(roles)) {
    const [roster, campaigns] = await Promise.all([
      listBroadcastRoster({
        unionId: gate.unionId,
        localId: gate.localId,
        rls,
      }),
      listBroadcastCampaigns({
        unionId: gate.unionId,
        localId: gate.localId,
        rls,
      }),
    ]);
    return NextResponse.json({
      notice: MEMBER_BROADCAST_NOTICE,
      roster,
      campaigns,
      mode: "officer",
    });
  }

  const roster = await listBroadcastRoster({
    unionId: gate.unionId,
    localId: gate.localId,
    rls,
  });
  const self = roster.find((r) => r.userId === gate.session.user.id);
  return NextResponse.json({
    notice: MEMBER_BROADCAST_NOTICE,
    self: self ?? {
      userId: gate.session.user.id,
      name: gate.session.user.name ?? "",
      email: gate.session.user.email ?? "",
      status: "none",
    },
    mode: "member",
  });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("consent"),
    consent: z.boolean(),
    locale: z.enum(["en", "fr"]).default("en"),
  }),
  z.object({
    action: z.literal("send"),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(12000),
    recipientUserIds: z
      .array(z.string().min(1))
      .min(1)
      .max(MEMBER_BROADCAST_MAX_RECIPIENTS_PER_SEND),
    explicitTrackingOptIn: z.boolean().default(false),
    locale: z.enum(["en", "fr"]).default("en"),
    dryRun: z.boolean().default(false),
    mfaCode: z.string().max(32).optional(),
  }),
]);

export async function POST(request: Request) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extraHeaders?: HeadersInit) => {
    const headers = new Headers(extraHeaders);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const gate = await requireBroadcastSession();
  if (!gate.ok) {
    return respond({ error: gate.error }, gate.status);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return respond({ error: "Invalid body" }, 400);
  }

  const rls = {
    userId: gate.session.user.id,
    unionId: gate.unionId,
    localId: gate.localId,
    mfaVerified: true,
  };
  const roles = (gate.session.user.roles ?? []) as UserRole[];

  if (parsed.data.action === "consent") {
    const email = gate.session.user.email;
    if (!email) {
      return respond({ error: "Email required" }, 400);
    }
    const result = await setOwnBroadcastConsent({
      unionId: gate.unionId,
      localId: gate.localId,
      userId: gate.session.user.id,
      email,
      consent: parsed.data.consent,
      rls,
    });
    if (result !== "ok") {
      return respond(
        { error: "Broadcast consent unavailable (gates closed)." },
        503,
      );
    }
    await auditLog.log({
      userId: gate.session.user.id,
      action: parsed.data.consent
        ? "broadcast.consent_granted"
        : "broadcast.consent_revoked",
      resourceType: "local",
      resourceId: gate.localId,
      unionId: gate.unionId,
      localId: gate.localId,
      requestId: correlation.requestId,
    });
    return respond({ ok: true });
  }

  if (!canManageBroadcast(roles)) {
    return respond({ error: "Forbidden" }, 403);
  }

  if (parsed.data.dryRun) {
    const result = await sendMemberBroadcast({
      unionId: gate.unionId,
      localId: gate.localId,
      actorUserId: gate.session.user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      recipientUserIds: parsed.data.recipientUserIds,
      explicitTrackingOptIn: parsed.data.explicitTrackingOptIn,
      locale: parsed.data.locale,
      rls,
      from: readSmtpEnv("EMAIL_FROM").value ?? "noreply@example.com",
      replyTo: readSmtpEnv("EMAIL_FROM").value ?? "noreply@example.com",
      unsubscribeApiBase: `${emailAppBaseUrl(new URL(request.url).origin)}/api/broadcast/unsubscribe`,
      dryRun: true,
    });
    if (!result.ok) {
      return respond({ error: result.reason }, 400);
    }
    return respond({
      ok: true,
      dryRun: true,
      recipientCount: result.recipientCount,
      trackingApplied: result.trackingApplied,
    });
  }

  const challenge = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: parsed.data.mfaCode,
  });
  if (!challenge.ok) {
    await auditLog.log({
      userId: gate.session.user.id,
      action: "broadcast.send",
      resourceType: "local",
      resourceId: gate.localId,
      unionId: gate.unionId,
      localId: gate.localId,
      outcome: challenge.outcome,
      requestId: correlation.requestId,
      metadata: { reason: `mfa_step_up_${challenge.code}` },
    }).catch(() => undefined);
    return respond(
      {
        error:
          challenge.code === "required"
            ? "A fresh MFA code is required before sending member broadcast."
            : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      challenge.retryAfterSeconds
        ? { "Retry-After": String(challenge.retryAfterSeconds) }
        : undefined,
    );
  }

  const from = readSmtpEnv("EMAIL_FROM").value;
  if (!from) {
    return respond({ error: "EMAIL_FROM is not configured" }, 503);
  }

  const origin = new URL(request.url).origin;
  const base = emailAppBaseUrl(origin);
  const result = await sendMemberBroadcast({
    unionId: gate.unionId,
    localId: gate.localId,
    actorUserId: gate.session.user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    recipientUserIds: parsed.data.recipientUserIds,
    explicitTrackingOptIn: parsed.data.explicitTrackingOptIn,
    locale: parsed.data.locale,
    rls,
    from,
    replyTo: from.includes("<")
      ? (from.match(/<([^>]+)>/)?.[1] ?? from)
      : from,
    unsubscribeApiBase: `${base}/api/broadcast/unsubscribe`,
  });

  if (!result.ok) {
    return respond({ error: result.reason }, 400);
  }

  await auditLog.log({
    userId: gate.session.user.id,
    action: "broadcast.send",
    resourceType: "member_broadcast_campaign",
    resourceId: result.campaignId,
    unionId: gate.unionId,
    localId: gate.localId,
    outcome: "success",
    requestId: correlation.requestId,
    metadata: {
      accepted: String(result.accepted),
      failed: String(result.failed),
      trackingApplied: String(result.trackingApplied),
    },
  });

  return respond(result);
}
