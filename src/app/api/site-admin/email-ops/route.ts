import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import {
  composeInviteAcceptEmail,
  composeOfficerMeetingReminderEmail,
  composePasswordResetEmail,
  composeRsvpConfirmationEmail,
  composeSignInLinkEmail,
  EMAIL_ENGINE_FIXTURES,
  type EmailLocale,
  type TransactionalPresetId,
  validateEmailArtifact,
} from "@/lib/email/engine";
import {
  getSmtpConfigSnapshot,
  isEmailEnabled,
  isTransactionalEmailAvailable,
  sendClassifiedEmail,
} from "@/lib/email/send";
import { readProductNewsConfig } from "@/lib/email/product-news-config";

export const dynamic = "force-dynamic";

const PRESETS: TransactionalPresetId[] = [
  "invite_accept",
  "sign_in_link",
  "password_reset",
  "officer_meeting_reminder",
  "rsvp_confirmation",
];

function composePreset(
  id: TransactionalPresetId,
  locale: EmailLocale,
) {
  switch (id) {
    case "invite_accept":
      return composeInviteAcceptEmail({
        ...EMAIL_ENGINE_FIXTURES.invite_accept,
        locale,
      });
    case "sign_in_link":
      return composeSignInLinkEmail({
        ...EMAIL_ENGINE_FIXTURES.sign_in_link,
        locale,
      });
    case "password_reset":
      return composePasswordResetEmail({
        ...EMAIL_ENGINE_FIXTURES.password_reset,
        locale,
      });
    case "officer_meeting_reminder":
      return composeOfficerMeetingReminderEmail({
        ...EMAIL_ENGINE_FIXTURES.officer_meeting_reminder,
        locale,
      });
    case "rsvp_confirmation":
      return composeRsvpConfirmationEmail({
        ...EMAIL_ENGINE_FIXTURES.rsvp_confirmation,
        locale,
      });
  }
}

const testSendSchema = z.object({
  action: z.literal("test_send"),
  presetId: z.enum([
    "invite_accept",
    "sign_in_link",
    "password_reset",
    "officer_meeting_reminder",
    "rsvp_confirmation",
  ]),
  locale: z.enum(["en", "fr"]).default("en"),
  to: z.string().email(),
});

export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const productNews = readProductNewsConfig();
  return NextResponse.json({
    presets: PRESETS.map((id) => ({
      id,
      classification:
        id === "password_reset" || id === "sign_in_link"
          ? "security"
          : "transactional",
    })),
    health: {
      emailEnabled: isTransactionalEmailAvailable(),
      emailFlag: isEmailEnabled(),
      smtp: getSmtpConfigSnapshot(),
      productNews: {
        enabled: productNews.enabled,
        reason: productNews.reason,
      },
    },
  });
}

export async function POST(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body &&
    typeof body === "object" &&
    "action" in body &&
    (body as { action?: string }).action === "preview"
  ) {
    const previewSchema = z.object({
      action: z.literal("preview"),
      presetId: z.enum([
        "invite_accept",
        "sign_in_link",
        "password_reset",
        "officer_meeting_reminder",
        "rsvp_confirmation",
      ]),
      locale: z.enum(["en", "fr"]).default("en"),
    });
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid preview" }, { status: 400 });
    }
    const artifact = composePreset(parsed.data.presetId, parsed.data.locale);
    const valid = validateEmailArtifact(artifact);
    return NextResponse.json({ artifact, valid });
  }

  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid test send" }, { status: 400 });
  }

  const artifact = composePreset(parsed.data.presetId, parsed.data.locale);
  const valid = validateEmailArtifact(artifact);
  if (!valid.ok) {
    return NextResponse.json(
      { error: "Invalid artifact", reasons: valid.reasons },
      { status: 400 },
    );
  }

  const classification =
    parsed.data.presetId === "password_reset" ||
    parsed.data.presetId === "sign_in_link"
      ? "security"
      : "transactional";

  const result = await sendClassifiedEmail({
    classification,
    to: parsed.data.to,
    subject: `[TEST] ${artifact.subject}`,
    text: artifact.text,
    html: artifact.html,
  });

  await auditLog.log({
    userId: gate.session.user.id,
    action: result.ok
      ? "site_admin.email_ops.test_send"
      : "site_admin.email_ops.test_send_failed",
    resourceType: "site_admin",
    resourceId: parsed.data.presetId,
    metadata: {
      locale: parsed.data.locale,
      ...(result.ok
        ? { messageId: result.messageId ?? "", transport: result.transport ?? "" }
        : { reason: result.reason }),
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, smtp: result.smtp },
      { status: result.reason === "not_configured" ? 503 : 502 },
    );
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
