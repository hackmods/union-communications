import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { auditDbBackend } from "@/lib/db/backend";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { divisions } from "@/lib/db/schema/tenant";
import { and, eq, isNull } from "drizzle-orm";
import {
  createCollectionDurable,
  findOrCreateLocal,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  unionId: z.string().min(1),
  localNumber: z.string().min(1).max(32),
  localSubText: z.string().max(200).optional(),
  collectionCode: z.string().min(1).max(32).optional(),
  collectionName: z.string().min(1).max(200).optional(),
  divisionId: z.string().optional(),
  mfaCode: z.string().max(32).optional(),
}).strict();

/**
 * POST /api/site-admin/locals
 *
 * Create (or find) a local under a union. platform_admin only.
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
        error: "Durable audit storage is required before provisioning a local.",
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
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  const audit = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
    localId?: string,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.provision",
      resourceType: "site_admin",
      resourceId: localId ?? parsed.data.unionId,
      unionId: parsed.data.unionId,
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
      await audit(challenge.outcome, { reason: `mfa_step_up_${challenge.code}` });
    } catch {
      return respond({ error: "Audit service unavailable", code: "audit_unavailable" }, 503);
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) headers.set("Retry-After", String(challenge.retryAfterSeconds));
    return NextResponse.json(
      { error: "Fresh MFA is required before provisioning a local.", code: `mfa_step_up_${challenge.code}` },
      { status: challenge.status, headers: correlation.responseHeaders({ "Cache-Control": "private, no-store", ...Object.fromEntries(headers.entries()) }) },
    );
  }

  try {
    await audit("success", { phase: "provision_authorized" });
  } catch {
    return respond({ error: "The local was not provisioned because its authorization audit could not be confirmed.", code: "audit_unavailable" }, 503);
  }

  let mutationStarted = false;
  try {
    if (parsed.data.divisionId) {
      const [division] = await getDb().select({ id: divisions.id }).from(divisions).where(and(
        eq(divisions.id, parsed.data.divisionId),
        eq(divisions.unionId, parsed.data.unionId),
        isNull(divisions.archivedAt),
      )).limit(1);
      if (!division) {
        await audit("denied", { reason: "division_not_found" }).catch(() => undefined);
        return respond({ error: "Bargaining collective not found" }, 404);
      }
    }
    mutationStarted = true;
    const { local, created } = await findOrCreateLocal({
      unionId: parsed.data.unionId,
      localNumber: parsed.data.localNumber,
      subText: parsed.data.localSubText,
      divisionId: parsed.data.divisionId,
    });

    let collectionId: string | undefined;
    if (parsed.data.collectionCode && parsed.data.collectionName) {
      const unit = await createCollectionDurable({
        unionId: parsed.data.unionId,
        localId: local.id,
        code: parsed.data.collectionCode,
        name: parsed.data.collectionName,
      });
      collectionId = unit.id;
    }

    await auditLog.log({
      userId: gate.session.user.id,
      action: created
        ? "site_admin.local.create"
        : "site_admin.local.find_existing",
      resourceType: "site_admin",
      resourceId: local.id,
      unionId: parsed.data.unionId,
      localId: local.id,
      metadata: {
        phase: "provision_result",
        created: String(created),
        collectionCreated: String(Boolean(collectionId)),
      },
      outcome: "success",
      requestId: correlation.requestId,
    });

    return respond({
      ok: true,
      local: {
        id: local.id,
        localNumber: local.localNumber,
        subText: local.subText,
        unionId: local.unionId,
      },
      created,
      collectionId,
    });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/locals");
    const message = err instanceof Error ? err.message : "";
    if (message.includes("different bargaining collective")) {
      await audit("denied", { reason: "different_bargaining_collective" }).catch(() => undefined);
      return respond({ error: "That local already belongs to a different bargaining collective." }, 409);
    }
    if (mutationStarted) {
      await audit("error", { phase: "provision_result_unconfirmed" }).catch(() => undefined);
      return respond({ error: "The local or bargaining unit may have been created, but the result could not be confirmed. Reload the directory before retrying.", code: "local_result_unconfirmed" }, 503);
    }
    await audit("error", { reason: "provision_failed_before_write" }).catch(() => undefined);
    return respond({ error: "Create local failed" }, 500);
  }
}
