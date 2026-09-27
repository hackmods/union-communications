import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { publishImport } from "@/lib/data-workbench/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, { ...init, headers: correlation.responseHeaders(headers) });
  };

  const access = await requireDataAccess(true);
  if (!access.ok) return respond({ error: access.error }, { status: access.status });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { mfaCode?: unknown } | null;
  if (body?.mfaCode !== undefined && (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)) {
    return respond({ error: "Invalid MFA challenge" }, { status: 400 });
  }
  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, string>,
  ) => auditLog.log({
    userId: access.session.user.id,
    action: "data.import.publish",
    resourceType,
    resourceId,
    unionId: access.unionId,
    localId: access.localId,
    outcome,
    requestId: correlation.requestId,
    metadata,
  });
  const challenge = await verifyFreshMfaStepUp({
    userId: access.session.user.id,
    code: typeof body?.mfaCode === "string" ? body.mfaCode : undefined,
  });
  if (!challenge.ok) {
    await recordOutcome(challenge.outcome, "data_import_run", id, { reason: `mfa_step_up_${challenge.code}` });
    return respond(
      {
        error: challenge.code === "required" ? "A fresh MFA code is required before publishing member data." : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        ...(challenge.retryAfterSeconds
          ? { headers: { "Retry-After": String(challenge.retryAfterSeconds) } }
          : {}),
      },
    );
  }
  let publication: Awaited<ReturnType<typeof publishImport>>;
  try {
    const rlsContext = await rlsContextForSession(access.session) ?? {};
    publication = await withRlsContext(rlsContext, () => publishImport(access, id));
  } catch (error) {
    await recordOutcome("error", "data_import_run", id, { reason: "publish_failed" }).catch(() => undefined);
    return respond({ error: error instanceof Error ? error.message : "The import could not be published." }, { status: 400 });
  }
  if (!publication) {
    await recordOutcome("denied", "data_import_run", id, { reason: "import_missing_or_already_published" });
    return respond({ error: "Import not found or already published." }, { status: 404 });
  }
  try {
    await recordOutcome("success", "data_publication", publication.publicationId, {
      acceptedCount: String(publication.acceptedCount),
      heldCount: String(publication.heldCount),
    });
  } catch {
    return respond({
      error: "The publication completed, but its audit record could not be confirmed. Contact the instance operator before retrying.",
      code: "publication_audit_unavailable",
    }, { status: 503 });
  }
  return respond({ publication }, { status: 201 });
}
