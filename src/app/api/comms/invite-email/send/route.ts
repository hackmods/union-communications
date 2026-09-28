import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { auditLog } from "@/lib/audit/store";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import { resolveOpenTracking } from "@/lib/email/tracking";
import { buildEventInviteEmail } from "@/lib/comms/event-email";
import { renderEmailDocument, resolvePlatformEmailBrand } from "@/lib/email/engine";
import { readSmtpEnv, sendClassifiedEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  to: z.string().email(),
  locale: z.enum(["en", "fr"]).default("en"),
  localNumber: z.string().min(1).max(32),
  fields: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    quorumNeeded: z.string().optional(),
    contactName: z.string().optional(),
  }),
  explicitTrackingOptIn: z.boolean().default(false),
});

/**
 * POST /api/comms/invite-email/send
 * Dual-gated Comms auto-send (ADR-022). Copy/mailto remains the default UX.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 403 });
  }

  const gate = await assertEnterpriseEmailCapability(
    "comms_auto_send",
    unionId,
  );
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const invite = buildEventInviteEmail(parsed.data.fields, {
    locale: parsed.data.locale,
    localNumber: parsed.data.localNumber,
  });
  const artifact = renderEmailDocument({
    locale: parsed.data.locale,
    classification: "transactional",
    subject: invite.subject,
    blocks: [{ type: "paragraph", text: invite.body }],
    brand: resolvePlatformEmailBrand(),
  });

  const tracking = await resolveOpenTracking({
    unionId,
    explicitOptIn: parsed.data.explicitTrackingOptIn,
  });

  const from = readSmtpEnv("EMAIL_FROM").value;
  if (!from) {
    return NextResponse.json(
      { error: "EMAIL_FROM is not configured" },
      { status: 503 },
    );
  }

  const result = await sendClassifiedEmail({
    classification: "transactional",
    to: parsed.data.to,
    subject: artifact.subject,
    text: artifact.text,
    html: artifact.html,
    openTracking: tracking.apply,
  });

  await auditLog.log({
    userId: session.user.id,
    action: result.ok ? "comms.invite_email_send" : "comms.invite_email_send_failed",
    resourceType: "comms_invite",
    resourceId: session.user.localId ?? unionId,
    unionId,
    localId: session.user.localId,
    metadata: {
      trackingApplied: String(tracking.apply),
      ...(result.ok
        ? { messageId: result.messageId ?? "" }
        : { reason: result.reason }),
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    trackingApplied: tracking.apply,
  });
}
