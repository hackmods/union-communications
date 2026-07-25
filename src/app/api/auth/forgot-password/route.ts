import { NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { findResettableAccountByEmail } from "@/lib/auth/persist-user-password";
import { auditLog } from "@/lib/audit/store";
import {
  buildPasswordResetEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import { parseJsonBody } from "@/lib/validation/parse";

const forgotSchema = z.object({
  email: z.string().email().max(320),
});

/**
 * POST /api/auth/forgot-password
 * Always returns a generic success payload (no email enumeration).
 * Sends transactional mail when the account exists and SMTP is configured.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(forgotSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const account = await findResettableAccountByEmail(email);

  let emailSent = false;
  let emailReason: string | undefined;

  if (account) {
    const tokenRow = createPasswordResetToken({
      email: account.email,
      userId: account.id,
    });
    const origin = new URL(req.url).origin;
    const resetPath = `/app/reset-password/${tokenRow.token}`;
    const resetUrl = `${emailAppBaseUrl(origin)}${resetPath}`;
    const copy = buildPasswordResetEmail({
      name: account.name,
      resetUrl,
      expiresAt: tokenRow.expiresAt,
    });
    const result = await sendTransactionalEmail({
      to: account.email,
      subject: copy.subject,
      text: copy.text,
    });
    emailSent = result.ok;
    emailReason = result.ok ? undefined : result.reason;

    await auditLog.log({
      userId: account.id,
      action: result.ok ? "email.password_reset" : "email.password_reset_skipped",
      resourceType: "auth",
      resourceId: account.id,
      details: {
        email: account.email,
        reason: emailReason,
        source: account.source,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    // Generic copy — same shape whether or not the account exists.
    message: "If an account exists for that email, a reset link was sent.",
    emailSent,
    emailReason: account ? emailReason : undefined,
  });
}
