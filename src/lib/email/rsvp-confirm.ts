import { auditLog } from "@/lib/audit/store";
import {
  buildRsvpConfirmationEmail,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";

/**
 * Optional one-shot RSVP confirmation (R3).
 * Call from the public RSVP submit route when `consentEmailConfirm` is true
 * and an email was provided. No-ops (returns not_configured) when SMTP is off.
 *
 * Hook for Calendar R1 — leave wired even if the route lands later.
 */
export async function maybeSendRsvpConfirmation(input: {
  to: string;
  meeting: {
    id: string;
    title: string;
    startsAt: string;
    location: string;
    unionId?: string;
    localId?: string;
  };
  attending: string;
  joinMode?: string;
  /** Audit actor — public form uses "public-rsvp". */
  actorUserId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const copy = buildRsvpConfirmationEmail({
    title: input.meeting.title,
    startsAt: input.meeting.startsAt,
    location: input.meeting.location,
    attending: input.attending,
    joinMode: input.joinMode,
  });
  const result = await sendTransactionalEmail({
    to: input.to,
    subject: copy.subject,
    text: copy.text,
  });

  await auditLog.log({
    userId: input.actorUserId ?? "public-rsvp",
    action: result.ok ? "email.rsvp_confirm" : "email.rsvp_confirm_skipped",
    resourceType: "union_meeting",
    resourceId: input.meeting.id,
    unionId: input.meeting.unionId,
    localId: input.meeting.localId,
    metadata: {
      to: input.to,
      ...(result.ok
        ? { messageId: result.messageId ?? "" }
        : { reason: result.reason }),
    },
  });

  if (result.ok) return { ok: true };
  return { ok: false, reason: result.reason };
}
