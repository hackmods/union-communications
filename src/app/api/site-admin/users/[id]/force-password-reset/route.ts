import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, unions } from "@/lib/db/schema/tenant";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import {
  buildPasswordResetEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import {
  sendTransactionalEmail,
  type SmtpConfigSnapshot,
} from "@/lib/email/send";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * POST /api/site-admin/users/[id]/force-password-reset
 *
 * Issue a fresh password-reset token AND send the email directly — no
 * rate limit applies (we are the platform operator). Mirrors the
 * capability of `/api/auth/forgot-password` but derives the URL from a
 * `Request` and emits `site_admin.user.force_password_reset` under the
 * `site_admin` resource type.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        archivedAt: users.archivedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const target = rows[0];
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (target.archivedAt) {
      return NextResponse.json(
        { error: "User is archived — cannot force reset on archived account" },
        { status: 409 },
      );
    }

    const token = await createPasswordResetToken({
      email: target.email,
      userId: target.id,
    });
    const origin = new URL(req.url).origin;
    const resetUrl = `${emailAppBaseUrl(origin)}/app/reset-password/${token.token}`;

    const copy = buildPasswordResetEmail({
      name: target.name,
      resetUrl,
      expiresAt: token.expiresAt,
    });
    const result = await sendTransactionalEmail({
      to: target.email,
      subject: copy.subject,
      text: copy.text,
    });

    let smtp: SmtpConfigSnapshot | undefined;
    if (!result.ok) {
      smtp = result.smtp;
    }

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.user.force_password_reset",
      resourceType: "site_admin",
      resourceId: target.id,
      unionId: await readUnionId(target.id),
      metadata: {
        targetEmail: target.email,
        emailSent: String(result.ok),
        ...(result.ok ? {} : { reason: result.reason ?? "unknown" }),
      },
    });

    void unions;

    return NextResponse.json({
      ok: true,
      sent: result.ok,
      token: token.token,
      ...(result.ok
        ? {}
        : {
            reason: result.reason,
            error: result.error,
            smtp,
          }),
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/users/[id]/force-password-reset");
    return NextResponse.json(
      { error: "Force-password-reset failed" },
      { status: 500 },
    );
  }
}

async function readUnionId(userId: string): Promise<string | undefined> {
  try {
    const row = await getDb()
      .select({ unionId: users.unionId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row[0]?.unionId ?? undefined;
  } catch {
    return undefined;
  }
}
