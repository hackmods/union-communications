import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceEdit,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import {
  buildEmailDraft,
  EMAIL_TEMPLATE_IDS,
} from "@/lib/grievance/email-templates";
import { resolveOpenTracking } from "@/lib/email/tracking";
import { readSmtpEnv, sendClassifiedEmail } from "@/lib/email/send";
import {
  renderEmailDocument,
  resolvePlatformEmailBrand,
} from "@/lib/email/engine";
import { grievanceStore } from "@/lib/grievance/store";
import { getTenantContext } from "@/lib/tenant/loader";
import type { EmailTemplateId } from "@/types/grievance";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  template: z.string().refine(
    (v): v is EmailTemplateId =>
      (EMAIL_TEMPLATE_IDS as string[]).includes(v),
  ),
  locale: z.enum(["en", "fr"]).default("en"),
  to: z.string().email(),
  explicitTrackingOptIn: z.boolean().default(false),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/grievances/[id]/email-send
 * Dual-gated grievance SMTP (ADR-022). Copy-only remains the default path.
 */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await assertGrievanceEdit(actor, data.grievance))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const gate = await assertEnterpriseEmailCapability(
    "grievance_smtp",
    data.grievance.unionId,
  );
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tenant = getTenantContext(data.grievance.unionId);
  const config = tenant?.grievanceConfig;
  if (!config) {
    return NextResponse.json(
      { error: "Grievance config not found" },
      { status: 400 },
    );
  }

  const draft = buildEmailDraft(
    parsed.data.template,
    data.grievance,
    config,
    parsed.data.locale,
    tenant?.local?.localNumber,
  );

  const tracking = await resolveOpenTracking({
    unionId: data.grievance.unionId,
    explicitOptIn: parsed.data.explicitTrackingOptIn,
  });

  const artifact = renderEmailDocument({
    locale: parsed.data.locale,
    classification: "transactional",
    subject: draft.subject,
    blocks: [{ type: "paragraph", text: draft.body }],
    brand: resolvePlatformEmailBrand(),
  });

  const from = readSmtpEnv("EMAIL_FROM").value;
  if (!from) {
    return NextResponse.json(
      { error: "EMAIL_FROM is not configured" },
      { status: 503 },
    );
  }

  const result = await sendClassifiedEmail({
    classification: "transactional",
    to: parsed.data.to,
    subject: artifact.subject,
    text: artifact.text,
    html: artifact.html,
    openTracking: tracking.apply,
  });

  await auditLog.log({
    userId: session.user.id,
    action: result.ok ? "grievance.email_send" : "grievance.email_send_failed",
    resourceType: "grievance",
    resourceId: id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
    metadata: {
      template: parsed.data.template,
      trackingApplied: String(tracking.apply),
      ...(result.ok
        ? { messageId: result.messageId ?? "" }
        : { reason: result.reason }),
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    trackingApplied: tracking.apply,
  });
}
