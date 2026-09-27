import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import {
  assertUnionMeetingView,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { buildRsvpResponsesCsv } from "@/lib/meetings/rsvp-export";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import type { UnionMeeting } from "@/types/meetings";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders({
        "Cache-Control": "private, no-store",
      }),
    });

  const authResult = await requireMeetingsSession();
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
    Object.keys(rawBody).some((key) => key !== "mfaCode")
  ) {
    return respond({ error: "Invalid RSVP export request" }, 400);
  }
  const body = rawBody as { mfaCode?: unknown };
  if (
    body.mfaCode !== undefined &&
    (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)
  ) {
    return respond({ error: "Invalid MFA challenge" }, 400);
  }

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata: Record<string, string> = {},
    tenant?: Pick<UnionMeeting, "unionId" | "localId">,
  ) =>
    auditLog.log({
      userId: session.user.id,
      action: "meetings.events.export",
      resourceType: "union_meeting",
      resourceId,
      unionId: tenant?.unionId ?? session.user.unionId,
      localId: tenant?.localId ?? session.user.localId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  let meeting: UnionMeeting | null;
  try {
    meeting = await meetingsRsvpStore.getMeetingById(id);
  } catch {
    await recordOutcome("error", id, { reason: "meeting_lookup_failed" }).catch(
      () => undefined,
    );
    return respond(
      {
        error: "RSVP export is temporarily unavailable.",
        code: "export_unavailable",
      },
      503,
    );
  }

  if (!meeting || !assertUnionMeetingView(session, meeting)) {
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
        meeting.id,
        { reason: `mfa_step_up_${challenge.code}` },
        meeting,
      );
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    const response = NextResponse.json(
      {
        error:
          challenge.code === "required"
            ? "A fresh MFA code is required before exporting RSVP responses."
            : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        headers: correlation.responseHeaders(headers),
      },
    );
    return response;
  }

  let csv: string;
  let safeTitle: string;
  try {
    const responses = await meetingsRsvpStore.listResponses(id);
    csv = buildRsvpResponsesCsv({ meeting, responses });
    safeTitle = meeting.title.replace(/[^\w.-]+/g, "_").slice(0, 40);
  } catch {
    await recordOutcome(
      "error",
      meeting.id,
      { reason: "export_generation_failed" },
      meeting,
    ).catch(() => undefined);
    return respond({ error: "Export failed", code: "export_failed" }, 500);
  }

  try {
    await recordOutcome("success", meeting.id, {}, meeting);
  } catch {
    return respond(
      {
        error:
          "The RSVP export was not delivered because its audit record could not be confirmed.",
        code: "export_audit_unavailable",
      },
      503,
    );
  }

  return new NextResponse(csv, {
    headers: correlation.responseHeaders({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvp-${safeTitle}.csv"`,
      "Cache-Control": "private, no-store",
    }),
  });
}

/** Retire the direct CSV URL so response data cannot bypass step-up. */
export async function GET() {
  const correlation = createAuditRequestContext();
  return NextResponse.json(
    {
      error: "Use POST to request an RSVP export.",
      code: "method_not_allowed",
    },
    {
      status: 405,
      headers: correlation.responseHeaders({
        Allow: "POST",
        "Cache-Control": "private, no-store",
      }),
    },
  );
}
