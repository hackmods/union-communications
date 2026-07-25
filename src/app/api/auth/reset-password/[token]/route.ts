import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumePasswordResetToken,
  getPasswordResetToken,
} from "@/lib/auth/password-reset";
import { persistPasswordForEmail } from "@/lib/auth/persist-user-password";
import { hashPassword } from "@/lib/auth/password";
import { auditLog } from "@/lib/audit/store";
import { parseJsonBody } from "@/lib/validation/parse";

const resetSchema = z.object({
  password: z.string().min(8).max(200),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const row = getPasswordResetToken(token);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const expired = new Date(row.expiresAt).getTime() < Date.now();
  const status = row.consumedAt
    ? "consumed"
    : expired
      ? "expired"
      : "pending";
  return NextResponse.json({
    email: row.email,
    status,
    expiresAt: row.expiresAt,
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
  const parsed = parseJsonBody(resetSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const consumed = consumePasswordResetToken(token);
  if (!consumed.ok) {
    const message =
      consumed.error === "expired"
        ? "Reset link expired"
        : consumed.error === "consumed"
          ? "Reset link already used"
          : "Reset link not found";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const persisted = await persistPasswordForEmail(
    consumed.row.email,
    passwordHash,
  );
  if (!persisted.ok) {
    return NextResponse.json(
      { error: "Could not update password for this account" },
      { status: 400 },
    );
  }

  await auditLog.log({
    userId: consumed.row.userId,
    action: "auth.password_reset_complete",
    resourceType: "auth",
    resourceId: consumed.row.userId,
    details: {
      email: consumed.row.email,
      source: persisted.source,
    },
  });

  return NextResponse.json({
    ok: true,
    email: consumed.row.email,
    message: "Password updated. Sign in with your new password.",
  });
}
