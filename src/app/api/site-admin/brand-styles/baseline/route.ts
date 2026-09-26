import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomizationSession } from "@/lib/auth/customization-session";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { draftBrandBaselineFromTheme } from "@/lib/brand/brand-baseline-from-styles";
import { unionBrandThemeSchema } from "@/lib/brand/union-brand-theme";
import { getTenantByUnionId } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { isPostgresConfigured } from "@/lib/db/client";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z
  .object({
    unionId: z.string().min(1).max(120),
    brandTheme: unionBrandThemeSchema,
    publish: z.boolean().optional(),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

/**
 * POST /api/site-admin/brand-styles/baseline
 * Draft (and optionally publish) brand:baseline from a Brand Styles theme.
 * Requires customization MFA stack when CUSTOMIZATION_ENABLED.
 */
export async function POST(req: Request) {
  const siteGate = await requireSiteAdminSession();
  if (!siteGate.ok) {
    return NextResponse.json(
      { error: siteGate.error },
      { status: siteGate.status },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const target = {
    id: `union-${parsed.data.unionId}`,
    kind: "union" as const,
    unionId: parsed.data.unionId,
    parentScopeId: "system",
    archived: false,
  };
  const gate = await requireCustomizationSession(
    target,
    parsed.data.publish ? "customization.publish" : "customization.edit",
  );
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    if (isPostgresConfigured()) {
      await hydrateTenantOverlayFromPostgres();
    }
    const seed = getTenantByUnionId(parsed.data.unionId);
    const unionName = seed?.union.name ?? parsed.data.unionId;
    const result = await draftBrandBaselineFromTheme({
      unionId: parsed.data.unionId,
      unionName,
      theme: {
        primaryColor: parsed.data.brandTheme.primaryColor.toUpperCase(),
        secondaryColor: parsed.data.brandTheme.secondaryColor.toUpperCase(),
        accentColor: parsed.data.brandTheme.accentColor.toUpperCase(),
        ...(parsed.data.brandTheme.headlineFontId
          ? { headlineFontId: parsed.data.brandTheme.headlineFontId }
          : {}),
        ...(parsed.data.brandTheme.bodyFontId
          ? { bodyFontId: parsed.data.brandTheme.bodyFontId }
          : {}),
      },
      actorId: gate.actor.userId,
      rlsContext: gate.rlsContext,
      publish: parsed.data.publish === true,
      reason: parsed.data.reason,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    await auditLog.log({
      userId: gate.actor.userId,
      action: parsed.data.publish
        ? "site_admin.brand_styles.baseline_publish"
        : "site_admin.brand_styles.baseline_draft",
      resourceType: "site_admin",
      resourceId: result.resourceId,
      unionId: parsed.data.unionId,
      metadata: {
        published: Boolean(result.published),
        releaseId: result.releaseId ?? "",
      },
    });

    return NextResponse.json({
      ok: true,
      resourceId: result.resourceId,
      lockVersion: result.lockVersion,
      published: Boolean(result.published),
      releaseId: result.releaseId ?? null,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/brand-styles/baseline");
    return NextResponse.json({ error: "Baseline update failed" }, { status: 500 });
  }
}
