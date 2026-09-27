import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import {
  buildReceiptZip,
  buildTravelExportPdf,
  buildTravelExportXlsx,
  travelExportFilename,
} from "@/lib/travel/export";
import { travelStore } from "@/lib/travel/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import type {
  CashAdvance,
  ExpenseClaim,
  TravelAuthorization,
} from "@/types/travel";

type TravelExportFormat = "xlsx" | "pdf" | "zip";

function isTravelExportFormat(value: unknown): value is TravelExportFormat {
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

  const authResult = await requireTravelSession();
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
    return respond({ error: "Invalid travel export request" }, 400);
  }
  const body = rawBody as { format?: unknown; mfaCode?: unknown };
  if (
    !isTravelExportFormat(body.format) ||
    (body.mfaCode !== undefined &&
      (typeof body.mfaCode !== "string" || body.mfaCode.length > 32))
  ) {
    return respond({ error: "Invalid travel export format or challenge" }, 400);
  }
  const format = body.format;

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata: Record<string, string> = {},
    tenant?: Pick<TravelAuthorization, "unionId" | "localId">,
  ) =>
    auditLog.log({
      userId: session.user.id,
      action: "travel.export",
      resourceType: "travel_authorization",
      resourceId,
      unionId: tenant?.unionId ?? session.user.unionId,
      localId: tenant?.localId ?? session.user.localId,
      outcome,
      requestId: correlation.requestId,
      metadata: { format, ...metadata },
    });

  let authorization: TravelAuthorization | null;
  try {
    authorization = await travelStore.getAuthorization(id);
  } catch (error) {
    reportApiFailure(error, "/api/travel/[id]/export");
    await recordOutcome("error", id, { reason: "authorization_lookup_failed" }).catch(
      () => undefined,
    );
    return respond(
      { error: "Travel export is temporarily unavailable.", code: "export_unavailable" },
      503,
    );
  }

  if (!authorization || !assertTravelView(session, authorization)) {
    try {
      await recordOutcome(
        "denied",
        id,
        { reason: "not_found_or_out_of_scope" },
      );
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
        authorization.id,
        { reason: `mfa_step_up_${challenge.code}` },
        authorization,
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
            ? "A fresh MFA code is required before exporting travel records."
            : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      challenge.retryAfterSeconds
        ? { "Retry-After": String(challenge.retryAfterSeconds) }
        : undefined,
    );
  }

  let advance: CashAdvance | null;
  let claim: ExpenseClaim | null;
  let bytes: Uint8Array;
  let contentType: string;
  let filename: string;
  try {
    [advance, claim] = await Promise.all([
      travelStore.getAdvanceForAuth(id),
      travelStore.getClaimForAuth(id),
    ]);

    if (format === "pdf") {
      const blob = await buildTravelExportPdf({
        auth: authorization,
        advance,
        claim,
      });
      bytes = new Uint8Array(await blob.arrayBuffer());
      contentType = "application/pdf";
    } else if (format === "zip") {
      const [xlsxBuffer, pdfBlob] = await Promise.all([
        buildTravelExportXlsx({ auth: authorization, advance, claim }),
        buildTravelExportPdf({ auth: authorization, advance, claim }),
      ]);
      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
      const blob = await buildReceiptZip({
        auth: authorization,
        claim,
        xlsxBuffer,
        pdfBuffer,
      });
      bytes = new Uint8Array(await blob.arrayBuffer());
      contentType = "application/zip";
    } else {
      bytes = new Uint8Array(
        await buildTravelExportXlsx({ auth: authorization, advance, claim }),
      );
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    filename = travelExportFilename(authorization, format);
  } catch (error) {
    reportApiFailure(error, "/api/travel/[id]/export");
    await recordOutcome(
      "error",
      authorization.id,
      { reason: "export_generation_failed" },
      authorization,
    ).catch(() => undefined);
    return respond({ error: "Export failed", code: "export_failed" }, 500);
  }

  try {
    await recordOutcome("success", authorization.id, {}, authorization);
  } catch {
    return respond(
      {
        error: "The export was not delivered because its audit record could not be confirmed.",
        code: "export_audit_unavailable",
      },
      503,
    );
  }

  return new NextResponse(bytes, {
    headers: correlation.responseHeaders({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    }),
  });
}

/** Retire the query-string download path so exports cannot bypass step-up. */
export async function GET() {
  const correlation = createAuditRequestContext();
  return NextResponse.json(
    { error: "Use POST to request a travel export.", code: "method_not_allowed" },
    {
      status: 405,
      headers: correlation.responseHeaders({
        Allow: "POST",
        "Cache-Control": "private, no-store",
      }),
    },
  );
}
