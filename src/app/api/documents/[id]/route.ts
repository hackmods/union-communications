import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { attachmentsDbBackend, auditDbBackend } from "@/lib/db/backend";
import { canCrossLocalGrievance } from "@/lib/authorization/legacy-role-compat";
import { canDeleteSharedContent } from "@/lib/qol/access";
import { documentStore } from "@/lib/documents/store";
import type { UserRole } from "@/types/tenant";

type Params = { params: Promise<{ id: string }> };
const requestSchema = z.object({ mfaCode: z.string().max(32).optional() }).strict();

function respond(
  correlation: ReturnType<typeof createAuditRequestContext>,
  body: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, {
    status,
    headers: correlation.responseHeaders(headers),
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return respond(correlation, { error: authResult.error }, authResult.status);
  }
  const { id } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return respond(correlation, { error: "Invalid document deletion request" }, 400);
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const doc = await documentStore.getById(id);
  if (!doc || doc.unionId !== session.user.unionId) {
    return respond(correlation, { error: "Not found" }, 404);
  }
  const canView = canCrossLocalGrievance(roles) ||
    Boolean(session.user.localId && session.user.localId === doc.localId);
  if (!canView) {
    return respond(correlation, { error: "Not found" }, 404);
  }
  if (!canDeleteSharedContent(roles, doc.uploadedById, session.user.id)) {
    return respond(correlation, { error: "Forbidden" }, 403);
  }
  if (
    isHostedCustomerMode() &&
    (auditDbBackend() !== "postgres" || attachmentsDbBackend() !== "postgres")
  ) {
    return respond(
      correlation,
      { error: "Durable audit and document storage are required.", code: "durable_storage_required" },
      503,
    );
  }

  const record = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) => auditLog.log({
    userId: session.user.id,
    action: "document.delete",
    resourceType: "document",
    resourceId: doc.id,
    unionId: doc.unionId,
    localId: doc.localId,
    outcome,
    requestId: correlation.requestId,
    metadata,
  });

  const challenge = await verifyFreshMfaStepUp({
    userId: session.user.id,
    code: parsed.data.mfaCode,
  });
  if (!challenge.ok) {
    try {
      await record(challenge.outcome, { reason: `mfa_step_up_${challenge.code}` });
    } catch {
      return respond(correlation, { error: "Audit service unavailable", code: "audit_unavailable" }, 503);
    }
    return respond(
      correlation,
      {
        error: challenge.code === "required"
          ? "A fresh MFA code is required before deleting this document."
          : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      challenge.retryAfterSeconds
        ? { "Retry-After": String(challenge.retryAfterSeconds) }
        : undefined,
    );
  }

  try {
    await record("success", { phase: "delete_authorized" });
  } catch {
    return respond(
      correlation,
      { error: "The document was not deleted because its authorization audit could not be confirmed.", code: "audit_unavailable" },
      503,
    );
  }
  try {
    await documentStore.remove(id);
  } catch {
    await record("error", { phase: "delete_outcome_unconfirmed" }).catch(() => undefined);
    return respond(
      correlation,
      { error: "The document may have been deleted. Reload the vault and check before retrying.", code: "document_delete_unconfirmed" },
      503,
    );
  }
  try {
    await record("success", { phase: "delete_result" });
  } catch {
    return respond(
      correlation,
      { error: "The document was deleted, but its result audit could not be confirmed. Reload the vault before retrying.", code: "document_delete_unconfirmed" },
      503,
    );
  }
  return respond(correlation, { ok: true });
}
