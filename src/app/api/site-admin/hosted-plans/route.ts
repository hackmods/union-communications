import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  HOSTED_PLANS_ENV_KEY,
  HOSTED_SEAT_SKU_CENTS,
  isHostedPlansEnabled,
  parseAccessClass,
  parseCommercialClass,
  parseHubModuleSubset,
  parsePortalSurfaceSubset,
  parseSeatSku,
} from "@/lib/tenant/hosted-plans";
import {
  listHostedPlanTenants,
  setLocalHostedPlan,
  setUnionHostedPlan,
} from "@/lib/tenant/hosted-plans-store";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  scope: z.enum(["union", "local"]),
  id: z.string().min(1).max(120),
  accessClass: z.enum(["unset", "free", "full"]).optional(),
  commercialClass: z.enum(["unset", "member", "paid"]).optional(),
  seatSku: z.enum(["solo", "exec_under_50", "custom"]).nullable().optional(),
  seatCap: z.number().int().min(0).max(100_000).nullable().optional(),
  moduleSubset: z.array(z.string()).nullable().optional(),
  portalSurfaceSubset: z.array(z.string()).nullable().optional(),
  donationAcknowledged: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const enforcementEnabled = isHostedPlansEnabled();
  if (!isPostgresConfigured()) {
    return NextResponse.json({
      durable: false,
      enforcementEnabled,
      envKey: HOSTED_PLANS_ENV_KEY,
      seatSkuCents: HOSTED_SEAT_SKU_CENTS,
      unions: [],
      locals: [],
    });
  }

  const snapshot = await listHostedPlanTenants();
  return NextResponse.json({
    durable: true,
    enforcementEnabled,
    envKey: HOSTED_PLANS_ENV_KEY,
    seatSkuCents: HOSTED_SEAT_SKU_CENTS,
    unions: snapshot.unions,
    locals: snapshot.locals,
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
      { error: "Durable database required for hosted plans." },
      { status: 503 },
    );
  }

  const body = parsed.data;
  const patch = {
    ...(body.accessClass !== undefined
      ? { accessClass: parseAccessClass(body.accessClass) }
      : {}),
    ...(body.commercialClass !== undefined
      ? { commercialClass: parseCommercialClass(body.commercialClass) }
      : {}),
    ...(body.seatSku !== undefined
      ? { seatSku: parseSeatSku(body.seatSku) }
      : {}),
    ...(body.seatCap !== undefined ? { seatCap: body.seatCap } : {}),
    ...(body.moduleSubset !== undefined
      ? { moduleSubset: parseHubModuleSubset(body.moduleSubset) }
      : {}),
    ...(body.portalSurfaceSubset !== undefined
      ? {
          portalSurfaceSubset: parsePortalSurfaceSubset(
            body.portalSurfaceSubset,
          ),
        }
      : {}),
    ...(body.donationAcknowledged !== undefined
      ? { donationAcknowledged: body.donationAcknowledged }
      : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  };

  const ok =
    body.scope === "union"
      ? await setUnionHostedPlan(body.id, patch, gate.session.user.id)
      : await setLocalHostedPlan(body.id, patch, gate.session.user.id);

  if (!ok) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: gate.session.user.id,
    action: "site_admin.hosted_plans.update",
    resourceType: body.scope,
    resourceId: body.id,
    metadata: {
      scope: body.scope,
      ...(body.accessClass !== undefined
        ? { accessClass: body.accessClass }
        : {}),
      ...(body.commercialClass !== undefined
        ? { commercialClass: body.commercialClass }
        : {}),
      ...(body.seatSku !== undefined
        ? { seatSku: body.seatSku ?? "" }
        : {}),
      enforcementEnabled: String(isHostedPlansEnabled()),
    },
  });

  return NextResponse.json({ ok: true });
}
