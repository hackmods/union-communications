import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { isDownloadAllowed } from "@/lib/attachments/scan";
import { attachmentsDbBackend, auditDbBackend } from "@/lib/db/backend";
import { canCrossLocalGrievance } from "@/lib/authorization/legacy-role-compat";
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

export async function POST(request: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return respond(correlation, { error: authResult.error }, authResult.status);
  }
  const { id } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return respond(correlation, { error: "Invalid document download request" }, 400);
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const doc = await documentStore.getById(id);
  if (
    !doc ||
    doc.unionId !== session.user.unionId ||
    ( !canCrossLocalGrievance(roles) &&
      session.user.localId &&
      doc.localId !== session.user.localId )
  ) {
    return respond(correlation, { error: "Not found" }, 404);
  }
  if (!isDownloadAllowed(doc.scanStatus)) {
    return respond(correlation, { error: "Document is not available for download" }, 403);
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
    action: "document.download",
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
          ? "A fresh MFA code is required before downloading this document."
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
    await record("success", { phase: "download_authorized" });
  } catch {
    return respond(
      correlation,
      { error: "The file was not read because its authorization audit could not be confirmed.", code: "audit_unavailable" },
      503,
    );
  }

  let bytes: Uint8Array | null;
  try {
    bytes = await documentStore.readBytes(doc.storageKey);
  } catch {
    await record("error", { phase: "download_failed" }).catch(() => undefined);
    return respond(correlation, { error: "Document storage is unavailable.", code: "document_unavailable" }, 503);
  }
  if (!bytes) {
    await record("error", { phase: "download_missing" }).catch(() => undefined);
    return respond(correlation, { error: "File bytes not found in storage" }, 404);
  }
  try {
    await record("success", { phase: "download_delivered" });
  } catch {
    return respond(
      correlation,
      { error: "The file was not delivered because its result audit could not be confirmed.", code: "download_audit_unavailable" },
      503,
    );
  }

  const headers = new Headers({
    "Content-Type": doc.mimeType,
    "Content-Length": String(bytes.length),
    "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
  });
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: correlation.responseHeaders(headers),
  });
}

/** Retire the legacy direct-download URL so it cannot bypass step-up. */
export async function GET() {
  const correlation = createAuditRequestContext();
  return respond(
    correlation,
    { error: "Use POST to request this document download.", code: "method_not_allowed" },
    405,
    { Allow: "POST" },
  );
}
