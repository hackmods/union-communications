import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import {
  assertEnterpriseEmailCapability,
  getEnterpriseEmailHostFlags,
  getUnionEmailEntitlements,
} from "@/lib/email/enterprise-gates";
import { resolveOpenTracking } from "@/lib/email/tracking";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/capabilities
 * Session-scoped enterprise email gates for Hub/Comms UI (no secrets).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }

  const unionId = session.user.unionId;
  const host = getEnterpriseEmailHostFlags();
  if (!unionId) {
    return NextResponse.json({
      host,
      unionId: null,
      entitlements: null,
      allowed: {
        member_broadcast: false,
        outreach_lists: false,
        comms_auto_send: false,
        grievance_smtp: false,
        tracking_pixels: false,
      },
    });
  }

  const entitlements = await getUnionEmailEntitlements(unionId);
  const [broadcast, outreach, comms, grievance, tracking] = await Promise.all([
    assertEnterpriseEmailCapability("member_broadcast", unionId),
    assertEnterpriseEmailCapability("outreach_lists", unionId),
    assertEnterpriseEmailCapability("comms_auto_send", unionId),
    assertEnterpriseEmailCapability("grievance_smtp", unionId),
    assertEnterpriseEmailCapability("tracking_pixels", unionId),
  ]);

  return NextResponse.json({
    host,
    unionId,
    entitlements,
    allowed: {
      member_broadcast: broadcast.ok,
      outreach_lists: outreach.ok,
      comms_auto_send: comms.ok,
      grievance_smtp: grievance.ok,
      tracking_pixels: tracking.ok,
    },
  });
}

/** Preview whether an explicit tracking opt-in would apply. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.unionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { explicitOptIn?: boolean } = {};
  try {
    body = (await request.json()) as { explicitOptIn?: boolean };
  } catch {
    /* empty */
  }
  const result = await resolveOpenTracking({
    unionId: session.user.unionId,
    explicitOptIn: body.explicitOptIn === true,
  });
  return NextResponse.json(result);
}
