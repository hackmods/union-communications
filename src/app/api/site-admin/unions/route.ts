import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { auditDbBackend } from "@/lib/db/backend";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  createUnionDurable,
  hydrateTenantOverlayFromPostgres,
  setUnionCommsPresetId,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import { isTrustedUnionPresetId } from "@/lib/brand/union-preset-bridge";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(64).optional(),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
  commsPresetId: z.string().min(1).max(64).optional(),
  mfaCode: z.string().max(32).optional(),
}).strict();

/**
 * POST /api/site-admin/unions — create a union (+ optional first local).
 */
export async function POST(req: Request) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders({ "Cache-Control": "private, no-store" }),
    });
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return respond({ error: gate.error }, gate.status);
  }
  if (!isPostgresConfigured()) {
    return respond({ error: "Postgres is not configured" }, 503);
  }
  if (isHostedCustomerMode() && auditDbBackend() !== "postgres") {
    return respond(
      {
        error: "Durable audit storage is required before provisioning a union.",
        code: "durable_storage_required",
      },
      503,
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }
  const parsed = parseJsonBody(createSchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }
  if (
    parsed.data.commsPresetId &&
    !isTrustedUnionPresetId(parsed.data.commsPresetId)
  ) {
    return respond({ error: "Unknown Comms preset id" }, 400);
  }

  const audit = (
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata: Record<string, string>,
    unionId?: string,
    localId?: string,
    action = "site_admin.union.provision",
  ) => auditLog.log({
    userId: gate.session.user.id,
    action,
    resourceType: "site_admin",
    resourceId,
    ...(unionId ? { unionId } : {}),
    ...(localId ? { localId } : {}),
    outcome,
    requestId: correlation.requestId,
    metadata,
  });

  const challenge = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: parsed.data.mfaCode,
  });
  if (!challenge.ok) {
    try {
      await audit(challenge.outcome, "provision-request", { reason: `mfa_step_up_${challenge.code}` });
    } catch {
      return respond({ error: "Audit service unavailable", code: "audit_unavailable" }, 503);
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) headers.set("Retry-After", String(challenge.retryAfterSeconds));
    return NextResponse.json(
      { error: "Fresh MFA is required before creating a union.", code: `mfa_step_up_${challenge.code}` },
      { status: challenge.status, headers: correlation.responseHeaders({ "Cache-Control": "private, no-store", ...Object.fromEntries(headers.entries()) }) },
    );
  }

  try {
    try {
      await audit("success", "provision-request", { phase: "provision_authorized" });
    } catch {
      return respond({ error: "The union was not created because its authorization audit could not be confirmed.", code: "audit_unavailable" }, 503);
    }

    const seed = await createUnionDurable({
      name: parsed.data.name.trim(),
      slug: parsed.data.slug?.trim(),
      localNumber: parsed.data.localNumber?.trim(),
      localSubText: parsed.data.localSubText,
    });
    if (parsed.data.commsPresetId) {
      await setUnionCommsPresetId(seed.union.id, parsed.data.commsPresetId);
    }
    await hydrateTenantOverlayFromPostgres();
    await audit("success", seed.union.id, {
      phase: "provision_result",
      firstLocalCreated: String(Boolean(seed.locals?.[0])),
      commsPresetApplied: String(Boolean(parsed.data.commsPresetId)),
    }, seed.union.id, seed.locals?.[0]?.id, "site_admin.union.create");
    const firstLocal = seed.locals?.[0];
    return respond({
      ok: true,
      union: {
        id: seed.union.id,
        name: seed.union.name,
        slug: seed.union.slug,
        commsPresetId: parsed.data.commsPresetId ?? null,
      },
      local: firstLocal
        ? {
            id: firstLocal.id,
            localNumber: firstLocal.localNumber,
          }
        : null,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/unions");
    await audit("error", "provision-result", { phase: "provision_result_unconfirmed" }).catch(() => undefined);
    return respond(
      { error: "The union may have been created, but the result could not be confirmed. Reload the directory before retrying.", code: "union_result_unconfirmed" },
      503,
    );
  }
}
