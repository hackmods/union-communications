import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, isNull } from "drizzle-orm";
import { auditLog } from "@/lib/audit/store";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { unions } from "@/lib/db/schema/tenant";
import {
  getEnterpriseEmailHostFlags,
  setUnionEmailEntitlements,
} from "@/lib/email/enterprise-gates";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  unionId: z.string().min(1).max(120),
  memberBroadcastEnabled: z.boolean().optional(),
  commsAutoSendEnabled: z.boolean().optional(),
  grievanceSmtpEnabled: z.boolean().optional(),
  emailTrackingPixelsEnabled: z.boolean().optional(),
});

export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const host = getEnterpriseEmailHostFlags();
  if (!isPostgresConfigured()) {
    return NextResponse.json({
      host,
      durable: false,
      unions: [],
    });
  }

  const rows = await getDb()
    .select({
      id: unions.id,
      name: unions.name,
      slug: unions.slug,
      memberBroadcastEnabled: unions.memberBroadcastEnabled,
      commsAutoSendEnabled: unions.commsAutoSendEnabled,
      grievanceSmtpEnabled: unions.grievanceSmtpEnabled,
      emailTrackingPixelsEnabled: unions.emailTrackingPixelsEnabled,
    })
    .from(unions)
    .where(isNull(unions.archivedAt))
    .orderBy(asc(unions.name));

  return NextResponse.json({
    host,
    durable: true,
    unions: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      memberBroadcastEnabled: r.memberBroadcastEnabled === true,
      commsAutoSendEnabled: r.commsAutoSendEnabled === true,
      grievanceSmtpEnabled: r.grievanceSmtpEnabled === true,
      emailTrackingPixelsEnabled: r.emailTrackingPixelsEnabled === true,
    })),
  });
}

export async function PATCH(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Durable database required for email entitlements." },
      { status: 503 },
    );
  }

  const {
    unionId,
    memberBroadcastEnabled,
    commsAutoSendEnabled,
    grievanceSmtpEnabled,
    emailTrackingPixelsEnabled,
  } = parsed.data;

  const ok = await setUnionEmailEntitlements(unionId, {
    ...(memberBroadcastEnabled !== undefined
      ? { memberBroadcastEnabled }
      : {}),
    ...(commsAutoSendEnabled !== undefined ? { commsAutoSendEnabled } : {}),
    ...(grievanceSmtpEnabled !== undefined ? { grievanceSmtpEnabled } : {}),
    ...(emailTrackingPixelsEnabled !== undefined
      ? { emailTrackingPixelsEnabled }
      : {}),
  });

  if (!ok) {
    return NextResponse.json({ error: "Union not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: gate.session.user.id,
    action: "site_admin.email_entitlements.update",
    resourceType: "union",
    resourceId: unionId,
    unionId,
    metadata: {
      memberBroadcastEnabled:
        memberBroadcastEnabled === undefined
          ? "unchanged"
          : String(memberBroadcastEnabled),
      commsAutoSendEnabled:
        commsAutoSendEnabled === undefined
          ? "unchanged"
          : String(commsAutoSendEnabled),
      grievanceSmtpEnabled:
        grievanceSmtpEnabled === undefined
          ? "unchanged"
          : String(grievanceSmtpEnabled),
      emailTrackingPixelsEnabled:
        emailTrackingPixelsEnabled === undefined
          ? "unchanged"
          : String(emailTrackingPixelsEnabled),
      host: getEnterpriseEmailHostFlags(),
    },
  });

  return NextResponse.json({ ok: true });
}
