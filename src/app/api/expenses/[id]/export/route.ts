import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import {
  assertExpenseView,
  requireExpenseSession,
} from "@/lib/auth/expenses-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import {
  buildExpenseExportPdf,
  buildExpenseExportXlsx,
  buildExpenseReceiptZip,
  expenseExportFilename,
} from "@/lib/expenses/export";
import { expenseStore } from "@/lib/expenses/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import type { ExpenseSubmission } from "@/types/expenses";

type ExpenseExportFormat = "xlsx" | "pdf" | "zip";

function isExportFormat(value: unknown): value is ExpenseExportFormat {
  return value === "xlsx" || value === "pdf" || value === "zip";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlation = createAuditRequestContext();
  const respond = (
    body: unknown,
    status = 200,
    extraHeaders?: HeadersInit,
  ) => {
    const headers = new Headers(extraHeaders);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const authResult = await requireExpenseSession();
  if (!authResult.ok) {
    return respond({ error: authResult.error }, authResult.status);
  }

  const { session } = authResult;
  const { id } = await context.params;
  const rawBody = await request.json().catch(() => null);
  if (
    !rawBody ||
    typeof rawBody !== "object" ||
    Array.isArray(rawBody) ||
    Object.keys(rawBody).some((key) => key !== "format" && key !== "mfaCode")
  ) {
    return respond({ error: "Invalid export request" }, 400);
  }
  const body = rawBody as { format?: unknown; mfaCode?: unknown };
  if (!isExportFormat(body.format)) {
    return respond({ error: "Invalid export format" }, 400);
  }
  if (
    body.mfaCode !== undefined &&
    (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)
  ) {
    return respond({ error: "Invalid MFA challenge" }, 400);
  }
  const format = body.format;

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata?: Record<string, string>,
    tenant?: { unionId?: string; localId?: string },
  ) =>
    auditLog.log({
      userId: session.user.id,
      action: "expenses.export",
      resourceType: "expense_submission",
      resourceId,
      unionId: tenant?.unionId ?? session.user.unionId,
      localId: tenant?.localId ?? session.user.localId,
      outcome,
      requestId: correlation.requestId,
      metadata: { format, ...metadata },
    });

  let submission: ExpenseSubmission | null;
  try {
    submission = await expenseStore.getById(id);
  } catch (error) {
    reportApiFailure(error, "/api/expenses/[id]/export");
    await recordOutcome("error", id, { reason: "expense_lookup_failed" }).catch(
      () => undefined,
    );
    return respond(
      { error: "Expense export is temporarily unavailable.", code: "export_unavailable" },
      503,
    );
  }
  if (!submission || !assertExpenseView(session, submission)) {
    try {
      await recordOutcome("denied", id, { reason: "not_found_or_out_of_scope" });
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    return respond({ error: "Not found" }, 404);
  }

  const challenge = await verifyFreshMfaStepUp({
    userId: session.user.id,
    code: typeof body.mfaCode === "string" ? body.mfaCode : undefined,
  });
  if (!challenge.ok) {
    try {
      await recordOutcome(
        challenge.outcome,
        submission.id,
        { reason: `mfa_step_up_${challenge.code}` },
        submission,
      );
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    return respond(
      {
        error:
          challenge.code === "required"
            ? "A fresh MFA code is required before exporting this expense."
            : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      challenge.retryAfterSeconds
        ? { "Retry-After": String(challenge.retryAfterSeconds) }
        : undefined,
    );
  }

  let bytes: Uint8Array;
  let contentType: string;
  try {
    if (format === "pdf") {
      const blob = await buildExpenseExportPdf(submission);
      bytes = new Uint8Array(await blob.arrayBuffer());
      contentType = "application/pdf";
    } else if (format === "zip") {
      const [xlsxBuffer, pdfBlob] = await Promise.all([
        buildExpenseExportXlsx(submission),
        buildExpenseExportPdf(submission),
      ]);
      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
      const blob = await buildExpenseReceiptZip({
        submission,
        xlsxBuffer,
        pdfBuffer,
      });
      bytes = new Uint8Array(await blob.arrayBuffer());
      contentType = "application/zip";
    } else {
      bytes = new Uint8Array(await buildExpenseExportXlsx(submission));
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
  } catch (error) {
    reportApiFailure(error, "/api/expenses/[id]/export");
    await recordOutcome(
      "error",
      submission.id,
      { reason: "export_generation_failed" },
      submission,
    ).catch(() => undefined);
    return respond({ error: "Export failed", code: "export_failed" }, 500);
  }

  try {
    await recordOutcome("success", submission.id, undefined, submission);
  } catch {
    // Fail closed: do not return the sensitive export if its audit event cannot be confirmed.
    return respond(
      {
        error: "The export was not delivered because its audit record could not be confirmed.",
        code: "export_audit_unavailable",
      },
      503,
    );
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${expenseExportFilename(submission, format)}"`,
    "Cache-Control": "private, no-store",
  });
  return new NextResponse(new Uint8Array(bytes).buffer, {
    headers: correlation.responseHeaders(headers),
  });
}

/** Explicitly retire the legacy download URL so it cannot bypass step-up. */
export async function GET() {
  const correlation = createAuditRequestContext();
  const headers = correlation.responseHeaders({
    Allow: "POST",
    "Cache-Control": "private, no-store",
  });
  return NextResponse.json(
    { error: "Use POST to request an expense export.", code: "method_not_allowed" },
    { status: 405, headers },
  );
}
