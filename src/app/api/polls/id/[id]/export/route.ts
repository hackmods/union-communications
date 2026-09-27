import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import {
  assertPollView,
  requirePollsSession,
} from "@/lib/auth/polls-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import {
  buildPollResultsCsv,
  buildPollResultsXlsx,
} from "@/lib/polls/export";
import { pollsStore } from "@/lib/polls/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import type { PollDefinition } from "@/types/polls";

type PollExportFormat = "csv" | "xlsx";

function isPollExportFormat(value: unknown): value is PollExportFormat {
  return value === "csv" || value === "xlsx";
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

  const authResult = await requirePollsSession();
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
    return respond({ error: "Invalid poll export request" }, 400);
  }
  const body = rawBody as { format?: unknown; mfaCode?: unknown };
  if (
    !isPollExportFormat(body.format) ||
    (body.mfaCode !== undefined &&
      (typeof body.mfaCode !== "string" || body.mfaCode.length > 32))
  ) {
    return respond({ error: "Invalid poll export format or challenge" }, 400);
  }
  const format = body.format;

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata: Record<string, string> = {},
    tenant?: Pick<PollDefinition, "unionId" | "localId">,
  ) =>
    auditLog.log({
      userId: session.user.id,
      action: "polls.export",
      resourceType: "poll_definition",
      resourceId,
      unionId: tenant?.unionId ?? session.user.unionId,
      localId: tenant?.localId ?? session.user.localId,
      outcome,
      requestId: correlation.requestId,
      metadata: { format, ...metadata },
    });

  let poll: PollDefinition | null;
  try {
    poll = await pollsStore.getById(id);
  } catch (error) {
    reportApiFailure(error, "/api/polls/id/[id]/export");
    await recordOutcome("error", id, { reason: "poll_lookup_failed" }).catch(
      () => undefined,
    );
    return respond(
      { error: "Poll export is temporarily unavailable.", code: "export_unavailable" },
      503,
    );
  }

  if (!poll || !assertPollView(session, poll)) {
    try {
      await recordOutcome("denied", id, {
        reason: "not_found_or_out_of_scope",
      });
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
        poll.id,
        { reason: `mfa_step_up_${challenge.code}` },
        poll,
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
            ? "A fresh MFA code is required before exporting poll responses."
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
  let filename: string;
  try {
    const aggregates = await pollsStore.aggregates(id);
    if (!aggregates) {
      try {
        await recordOutcome(
          "denied",
          poll.id,
          { reason: "aggregates_missing" },
          poll,
        );
      } catch {
        return respond(
          { error: "Audit service unavailable", code: "audit_unavailable" },
          503,
        );
      }
      return respond({ error: "Not found" }, 404);
    }

    const safeSlug = poll.slug.replace(/[^\w.-]+/g, "_").slice(0, 40);
    if (format === "xlsx") {
      bytes = new Uint8Array(await buildPollResultsXlsx({ poll, aggregates }));
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `poll-${safeSlug}-results.xlsx`;
    } else {
      bytes = new TextEncoder().encode(
        await buildPollResultsCsv({ poll, aggregates }),
      );
      contentType = "text/csv; charset=utf-8";
      filename = `poll-${safeSlug}-results.csv`;
    }
  } catch (error) {
    reportApiFailure(error, "/api/polls/id/[id]/export");
    await recordOutcome(
      "error",
      poll.id,
      { reason: "export_generation_failed" },
      poll,
    ).catch(() => undefined);
    return respond({ error: "Export failed", code: "export_failed" }, 500);
  }

  try {
    await recordOutcome("success", poll.id, {}, poll);
  } catch {
    return respond(
      {
        error: "The poll export was not delivered because its audit record could not be confirmed.",
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

/** Retire the query-string download path so poll results cannot bypass step-up. */
export async function GET() {
  const correlation = createAuditRequestContext();
  return NextResponse.json(
    { error: "Use POST to request a poll export.", code: "method_not_allowed" },
    {
      status: 405,
      headers: correlation.responseHeaders({
        Allow: "POST",
        "Cache-Control": "private, no-store",
      }),
    },
  );
}
