import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { buildEmailDraft } from "@/lib/grievance/email-templates";
import { grievanceStore } from "@/lib/grievance/store";
import { getTenantContext } from "@/lib/tenant/loader";
import type { EmailTemplateId } from "@/types/grievance";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const data = await grievanceStore.getById(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertGrievanceView(session, data.grievance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const templateId = url.searchParams.get("template") as EmailTemplateId | null;
  const locale = (url.searchParams.get("locale") ?? "en") as "en" | "fr";

  if (!templateId) {
    return NextResponse.json(
      { error: "template query param required" },
      { status: 400 },
    );
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
    templateId,
    data.grievance,
    config,
    locale,
    tenant?.local?.localNumber,
  );

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.email_draft",
    resourceType: "grievance",
    resourceId: id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
    metadata: { templateId, locale },
  });

  return NextResponse.json({ draft });
}
