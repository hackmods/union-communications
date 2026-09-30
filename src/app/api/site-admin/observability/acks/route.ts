import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { withRlsContext } from "@/lib/db/rls-context";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  acknowledgeObservabilityIssue,
  acksBackend,
  unacknowledgeObservabilityIssue,
} from "@/lib/observability/acks";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    fingerprint: z.string().min(8).max(64),
    action: z.enum(["ack", "unack"]),
    note: z.string().max(500).optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

function responseContext() {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };
  return { correlation, respond };
}

/** POST /api/site-admin/observability/acks — MFA-gated acknowledge / clear. */
export async function POST(request: Request) {
  const { correlation, respond } = responseContext();
  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);

  if (acksBackend() === "none") {
    return respond(
      {
        error:
          "Issue acknowledgements require Postgres or a writable file log path.",
        code: "acks_backend_unavailable",
      },
      503,
    );
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return respond({ error: "Invalid ack request" }, 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return respond({ error: "Invalid ack request" }, 400);
  }

  const { fingerprint, action, note, mfaCode } = parsed.data;

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.observability.ack",
      resourceType: "site_admin",
      resourceId: fingerprint,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  const challenge = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: mfaCode,
  });
  if (!challenge.ok) {
    try {
      await recordOutcome(challenge.outcome, {
        phase: "ack_challenge",
        reason: `mfa_step_up_${challenge.code}`,
        ackAction: action,
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
        error: "Fresh MFA is required before acknowledging issues.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    try {
      await recordOutcome("success", {
        phase: "ack_authorized",
        ackAction: action,
      });
    } catch {
      return respond(
        {
          error:
            "The acknowledgement was not started because its access event could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const result = isPostgresConfigured()
      ? await withRlsContext(
          {
            userId: gate.session.user.id,
            platformAdmin: true,
            mfaVerified: true,
          },
          async () => {
            if (action === "ack") {
              const ack = await acknowledgeObservabilityIssue({
                fingerprint,
                userId: gate.session.user.id,
                note,
              });
              return { action, ack };
            }
            const cleared = await unacknowledgeObservabilityIssue(fingerprint);
            return { action, cleared };
          },
        )
      : action === "ack"
        ? {
            action,
            ack: await acknowledgeObservabilityIssue({
              fingerprint,
              userId: gate.session.user.id,
              note,
            }),
          }
        : {
            action,
            cleared: await unacknowledgeObservabilityIssue(fingerprint),
          };

    try {
      await recordOutcome("success", {
        phase: "ack_result",
        ackAction: action,
      });
    } catch {
      return respond(
        {
          error:
            "Acknowledgement could not be confirmed because access evidence is unavailable.",
          code: "ack_result_unconfirmed",
        },
        503,
      );
    }

    return respond(result);
  } catch {
    await recordOutcome("error", {
      phase: "ack_result",
      reason: "observability_ack_failed",
      ackAction: action,
    }).catch(() => undefined);
    return respond({ error: "Could not update issue acknowledgement." }, 503);
  }
}

export async function GET() {
  const { respond } = responseContext();
  return respond(
    { error: "Use POST to acknowledge operator issues." },
    405,
    { Allow: "POST" },
  );
}
