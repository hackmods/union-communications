import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  acceptInvite,
  getInviteByToken,
} from "@/lib/auth/invites";
import { invitesPostgresEnabled } from "@/lib/auth/invite-postgres";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { currentInviteTermsVersion } from "@/lib/public-documents/invite-terms";
import { parseJsonBody } from "@/lib/validation/parse";

const acceptSchema = z.object({
  password: z.string().min(8).max(200),
  acceptTerms: z.boolean().optional(),
  termsVersionId: z.string().min(1).max(200).optional(),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  const locale = new URL(req.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  let terms: Awaited<ReturnType<typeof currentInviteTermsVersion>> = null;
  try {
    terms = await currentInviteTermsVersion(locale);
  } catch {
    return NextResponse.json({ error: "Invite activation requirements are unavailable" }, { status: 503 });
  }
  const activationUnavailable = (isHostedCustomerMode() && !terms)
    || (Boolean(terms) && !invitesPostgresEnabled());
  return NextResponse.json({
    email: invite.email,
    name: invite.name,
    status: expired && invite.status === "pending" ? "expired" : invite.status,
    expiresAt: invite.expiresAt,
    roles: invite.roles,
    terms,
    activationUnavailable,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(acceptSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }
  const locale = new URL(req.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  let terms: Awaited<ReturnType<typeof currentInviteTermsVersion>> = null;
  try {
    terms = await currentInviteTermsVersion(locale);
  } catch {
    return NextResponse.json({ error: "Invite activation requirements are unavailable" }, { status: 503 });
  }
  if (isHostedCustomerMode() && !terms) {
    return NextResponse.json({ error: "Approved Terms are not available for activation" }, { status: 503 });
  }
  if (terms && (!parsed.data.acceptTerms || parsed.data.termsVersionId !== terms.versionId)) {
    return NextResponse.json({ error: "Review and accept the current Terms version before continuing" }, { status: parsed.data.termsVersionId && parsed.data.termsVersionId !== terms.versionId ? 409 : 400 });
  }
  if (!terms && (parsed.data.acceptTerms || parsed.data.termsVersionId)) {
    return NextResponse.json({ error: "The Terms version changed. Reload the invitation and try again." }, { status: 409 });
  }
  if (terms && !invitesPostgresEnabled()) {
    return NextResponse.json({ error: "Durable Terms acceptance is unavailable on this host" }, { status: 503 });
  }
  const result = await acceptInvite(
    token,
    parsed.data.password,
    terms ? { versionId: terms.versionId, requestId: randomUUID() } : undefined,
  );
  if (result.error || !result.user) {
    return NextResponse.json(
      { error: result.error ?? "Accept failed" },
      { status: result.error?.includes("Current Terms") || result.error?.includes("Terms version changed") ? 409 : 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    email: result.user.email,
    message: "Invite accepted. Sign in with your email and password.",
  });
}
