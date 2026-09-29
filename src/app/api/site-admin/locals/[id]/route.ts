import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { locals } from "@/lib/db/schema/tenant";
import {
  hardDeleteEmptyLocal,
  updateLocalFields,
} from "@/lib/site-admin/local-lifecycle";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const patchSchema = z
  .object({
    localNumber: z.string().min(1).max(32).optional(),
    subText: z.string().max(200).optional(),
    divisionId: z.union([z.string().min(1).max(64), z.null()]).optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.localNumber !== undefined ||
      data.subText !== undefined ||
      data.divisionId !== undefined,
    { message: "Provide localNumber, subText, and/or divisionId" },
  );

const deleteSchema = z
  .object({
    confirm: z.string().min(1).max(64),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/site-admin/locals/[id]
 *
 * Edit local number, sub-line, and/or bargaining-collective binding.
 */
export async function PATCH(req: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);
  if (!isPostgresConfigured()) {
    return respond({ error: "Postgres is not configured" }, 503);
  }

  const { id: localId } = await params;
  if (!localId) return respond({ error: "Missing local id" }, 400);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }
  const parsed = parseJsonBody(patchSchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  let unionId: string | undefined;
  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.update",
      resourceType: "site_admin",
      resourceId: localId,
      unionId,
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
      await recordOutcome(challenge.outcome, {
        reason: `mfa_step_up_${challenge.code}`,
      });
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return respond(
      {
        error: "Fresh MFA is required before editing a local.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  let mutationStarted = false;
  try {
    const db = getDb();
    const [existing] = await db
      .select({ id: locals.id, unionId: locals.unionId })
      .from(locals)
      .where(eq(locals.id, localId))
      .limit(1);
    if (!existing) {
      await recordOutcome("denied", { reason: "local_not_found" }).catch(
        () => undefined,
      );
      return respond({ error: "Local not found" }, 404);
    }
    unionId = existing.unionId;

    try {
      await recordOutcome("success", { phase: "update_authorized" });
    } catch {
      return respond(
        {
          error:
            "The local was not updated because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    mutationStarted = true;
    const result = await updateLocalFields(localId, {
      localNumber: parsed.data.localNumber,
      subText: parsed.data.subText,
      divisionId: parsed.data.divisionId,
    });
    if (!result.ok) {
      await recordOutcome("denied", {
        reason: result.code ?? "update_denied",
      }).catch(() => undefined);
      return respond(
        { error: result.error, code: result.code },
        result.status,
      );
    }

    try {
      await recordOutcome("success", {
        phase: "update_result",
        localNumber: result.data.localNumber,
      });
    } catch {
      return respond(
        {
          error:
            "The local may have been updated, but the result audit could not be confirmed. Reload before retrying.",
          code: "local_update_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ ok: true, local: result.data });
  } catch (error) {
    reportApiFailure(error, "PATCH /api/site-admin/locals/[id]");
    await recordOutcome("error", {
      reason: mutationStarted
        ? "update_outcome_unconfirmed"
        : "update_failed",
    }).catch(() => undefined);
    if (mutationStarted) {
      return respond(
        {
          error:
            "The local may have been updated, but its result could not be confirmed. Check the local before retrying.",
          code: "local_update_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ error: "Update failed" }, 500);
  }
}

/**
 * DELETE /api/site-admin/locals/[id]
 *
 * Hard-delete an archived empty local. Body: `{ confirm: <localNumber> }`.
 */
export async function DELETE(req: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);
  if (!isPostgresConfigured()) {
    return respond({ error: "Postgres is not configured" }, 503);
  }

  const { id: localId } = await params;
  if (!localId) return respond({ error: "Missing local id" }, 400);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }
  const parsed = parseJsonBody(deleteSchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  let unionId: string | undefined;
  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.delete",
      resourceType: "site_admin",
      resourceId: localId,
      unionId,
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
      await recordOutcome(challenge.outcome, {
        reason: `mfa_step_up_${challenge.code}`,
      });
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return respond(
      {
        error: "Fresh MFA is required before deleting a local.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select({ id: locals.id, unionId: locals.unionId })
      .from(locals)
      .where(eq(locals.id, localId))
      .limit(1);
    if (!existing) {
      await recordOutcome("denied", { reason: "local_not_found" }).catch(
        () => undefined,
      );
      return respond({ error: "Local not found" }, 404);
    }
    unionId = existing.unionId;

    try {
      await recordOutcome("success", { phase: "delete_authorized" });
    } catch {
      return respond(
        {
          error:
            "The local was not deleted because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const result = await hardDeleteEmptyLocal(
      localId,
      parsed.data.confirm,
      gate.session.user.id,
    );
    if (!result.ok) {
      await recordOutcome("denied", {
        reason: result.code ?? "delete_denied",
      }).catch(() => undefined);
      return respond(
        { error: result.error, code: result.code },
        result.status,
      );
    }

    try {
      await recordOutcome("success", {
        phase: "delete_result",
        deletedId: result.data.deletedId,
      });
    } catch {
      return respond(
        {
          error:
            "The local may have been deleted, but the result audit could not be confirmed. Reload before retrying.",
          code: "local_delete_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ ok: true, deletedId: result.data.deletedId });
  } catch (error) {
    reportApiFailure(error, "DELETE /api/site-admin/locals/[id]");
    await recordOutcome("error", { reason: "delete_failed" }).catch(
      () => undefined,
    );
    return respond({ error: "Delete failed" }, 500);
  }
}
