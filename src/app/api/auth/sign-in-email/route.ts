import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { createSignInToken } from "@/lib/auth/sign-in-link";
import { findSignInableAccountByEmail } from "@/lib/auth/sign-inable-account";
import {
  buildSignInLinkEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import { parseJsonBody } from "@/lib/validation/parse";

const schema = z.object({
  email: z.string().email().max(320),
});

/**
 * POST /api/auth/sign-in-email
 * Always returns a generic success payload (no email enumeration).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(schema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const account = await findSignInableAccountByEmail(email);

  let emailSent = false;
  let emailReason: string | undefined;

  if (account) {
    const tokenRow = await createSignInToken({
      email: account.email,
      userId: account.id,
    });
    const origin = new URL(req.url).origin;
    const signInPath = `/app/sign-in/${tokenRow.token}`;
    const signInUrl = `${emailAppBaseUrl(origin)}${signInPath}`;
    const copy = buildSignInLinkEmail({
      name: account.name,
      signInUrl,
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
      action: result.ok ? "email.sign_in_link" : "email.sign_in_link_skipped",
      resourceType: "auth",
      resourceId: account.id,
      metadata: {
        email: account.email,
        source: account.source,
        ...(emailReason ? { reason: emailReason } : {}),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a sign-in link was sent.",
    emailSent,
    emailReason: account ? emailReason : undefined,
  });
}
