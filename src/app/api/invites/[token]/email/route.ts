import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { getInviteByToken } from "@/lib/auth/invites";
import {
  buildInviteAcceptEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";

const INVITE_ROLES = new Set([
  "union_admin",
  "division_admin",
  "local_president",
  "platform_admin",
]);

/**
 * Send (or re-send) the invite accept link for a pending invite token.
 * POST /api/invites/[token]/email
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = session.user.roles ?? [];
  if (!roles.some((r) => INVITE_ROLES.has(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.unionId) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }

  const { token } = await context.params;
  const invite = getInviteByToken(token);
  if (!invite || invite.unionId !== session.user.unionId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "Invite is no longer pending" },
      { status: 400 },
    );
  }
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const acceptUrl = `${emailAppBaseUrl(origin)}/app/invite/${invite.token}`;
  const copy = buildInviteAcceptEmail({
    inviteeName: invite.name,
    acceptUrl,
    expiresAt: invite.expiresAt,
  });

  const result = await sendTransactionalEmail({
    to: invite.email,
    subject: copy.subject,
    text: copy.text,
  });

  await auditLog.log({
    userId: session.user.id,
    action: result.ok ? "email.invite" : "email.invite_skipped",
    resourceType: "invite",
    resourceId: invite.id,
    unionId: invite.unionId,
    localId: invite.localId,
    metadata: {
      to: invite.email,
      ...(result.ok
        ? { messageId: result.messageId ?? "" }
        : { reason: result.reason }),
    },
  });

  if (!result.ok) {
    const status = result.reason === "not_configured" ? 503 : 502;
    return NextResponse.json(
      { ok: false, reason: result.reason, error: result.error },
      { status },
    );
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
