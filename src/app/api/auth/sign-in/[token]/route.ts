import { NextResponse } from "next/server";
import { consumeSignInToken, getSignInToken } from "@/lib/auth/sign-in-link";
import { issueSignInGrant } from "@/lib/auth/sign-in-grants";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * GET /api/auth/sign-in/[token] — preview token status (no consume).
 */
export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  const row = await getSignInToken(token);
  if (!row) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (row.consumedAt) {
    return NextResponse.json({ status: "consumed", email: row.email });
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ status: "expired", email: row.email });
  }
  return NextResponse.json({
    status: "pending",
    email: row.email,
    expiresAt: row.expiresAt,
  });
}

/**
 * POST /api/auth/sign-in/[token] — consume token and issue a short-lived grant
 * for Credentials signIn({ signInGrant }).
 */
export async function POST(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await consumeSignInToken(token);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "not_found" ? 404 : 400 },
    );
  }

  const grant = issueSignInGrant(result.row.userId, result.row.email);
  return NextResponse.json({
    ok: true,
    email: result.row.email,
    signInGrant: grant,
  });
}
