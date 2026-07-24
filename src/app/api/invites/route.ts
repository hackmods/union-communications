import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { createInvite } from "@/lib/auth/invites";
import {
  buildInviteAcceptEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import type { UserRole } from "@/types/tenant";
import { parseJsonBody } from "@/lib/validation/parse";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  roles: z.array(z.string()).min(1),
  localId: z.string().optional(),
  divisionId: z.string().optional(),
  bargainingUnitId: z.string().optional(),
  /** When true, attempt transactional invite email after create (R3). */
  sendEmail: z.boolean().optional(),
});

const INVITE_ROLES = new Set([
  "union_admin",
  "division_admin",
  "local_president",
  "platform_admin",
]);

export async function POST(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(createSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const invite = createInvite({
    email: parsed.data.email,
    name: parsed.data.name,
    unionId: session.user.unionId,
    localId: parsed.data.localId ?? session.user.localId,
    divisionId: parsed.data.divisionId ?? session.user.divisionId,
    bargainingUnitId:
      parsed.data.bargainingUnitId ?? session.user.bargainingUnitId,
    roles: parsed.data.roles as UserRole[],
    invitedById: session.user.id,
  });

  const acceptPath = `/app/invite/${invite.token}`;
  let emailSent: boolean | undefined;
  let emailReason: string | undefined;

  if (parsed.data.sendEmail === true) {
    const origin = new URL(req.url).origin;
    const acceptUrl = `${emailAppBaseUrl(origin)}${acceptPath}`;
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
    emailSent = result.ok;
    emailReason = result.ok ? undefined : result.reason;

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
  }

  return NextResponse.json({
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    acceptPath,
    token: invite.token,
    ...(parsed.data.sendEmail === true
      ? { emailSent, emailReason }
      : {}),
  });
}
