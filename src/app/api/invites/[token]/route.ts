import { NextResponse } from "next/server";
import { z } from "zod";
import {
  acceptInvite,
  getInviteByToken,
} from "@/lib/auth/invites";
import { parseJsonBody } from "@/lib/validation/parse";

const acceptSchema = z.object({
  password: z.string().min(8).max(200),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const invite = getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  return NextResponse.json({
    email: invite.email,
    name: invite.name,
    status: expired && invite.status === "pending" ? "expired" : invite.status,
    expiresAt: invite.expiresAt,
    roles: invite.roles,
  });
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
  const result = await acceptInvite(token, parsed.data.password);
  if (result.error || !result.user) {
    return NextResponse.json(
      { error: result.error ?? "Accept failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    email: result.user.email,
    message: "Invite accepted. Sign in with your email and password.",
  });
}
