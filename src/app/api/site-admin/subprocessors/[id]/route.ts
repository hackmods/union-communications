import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditDbBackend } from "@/lib/db/backend";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import {
  subprocessorAuditEvents,
  subprocessorPublicProjections,
  subprocessorRegistry,
} from "@/lib/db/schema";
import {
  authorizeSubprocessorAdmin,
  noStoreJson,
} from "@/lib/site-admin/subprocessor-http";
import { subprocessorFieldsSchema } from "@/lib/site-admin/subprocessor-validation";

type RouteContext = { params: Promise<{ id: string }> };

function snapshot(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/** PATCH /api/site-admin/subprocessors/[id] — edits invalidate approval and publication. */
export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeSubprocessorAdmin();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = subprocessorFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: "Check the provider details and try again." }, { status: 400 });
  }
  try {
    return await withRlsContext(access.rlsContext, async () => {
      const db = getDb();
      const [before] = await db
        .select()
        .from(subprocessorRegistry)
        .where(eq(subprocessorRegistry.id, id))
        .limit(1)
        .for("update");
      if (!before) return noStoreJson({ error: "Provider record not found." }, { status: 404 });
      const now = new Date();
      const [record] = await db
        .update(subprocessorRegistry)
        .set({
          ...parsed.data,
          reviewStatus: "unreviewed",
          dpaStatus: "under_review",
          publicDisclosureApproved: false,
          reviewOwner: null,
          reviewedBy: null,
          reviewedAt: null,
          updatedBy: access.actorId,
          updatedAt: now,
        })
        .where(eq(subprocessorRegistry.id, id))
        .returning();
      await db.delete(subprocessorPublicProjections)
        .where(eq(subprocessorPublicProjections.id, id));
      await db.insert(subprocessorAuditEvents).values({
        id: crypto.randomUUID(),
        actorId: access.actorId,
        providerId: id,
        action: "updated",
        beforeRecord: snapshot(before),
        afterRecord: snapshot(record),
      });
      return noStoreJson({ record });
    });
  } catch {
    return noStoreJson({ error: "Could not update the provider record." }, { status: 500 });
  }
}

const reviewSchema = z.object({
  reviewStatus: z.enum(["approved", "rejected"]),
  dpaStatus: z.enum(["unreviewed", "under_review", "approved", "not_applicable"]),
  reviewOwner: z.string().trim().min(1).max(160),
  publicDisclosureApproved: z.boolean(),
  mfaCode: z.string().max(32).optional(),
}).strict();

/** POST /api/site-admin/subprocessors/[id] — second-person sign-off. */
export async function POST(request: Request, context: RouteContext) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    return Response.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const access = await authorizeSubprocessorAdmin();
  if (!access.ok) {
    const headers = new Headers(access.response.headers);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    return new Response(access.response.body, {
      status: access.response.status,
      statusText: access.response.statusText,
      headers: correlation.responseHeaders(headers),
    });
  }
  if (isHostedCustomerMode() && auditDbBackend() !== "postgres") {
    return respond(
      { error: "Review is unavailable until durable audit storage is configured.", code: "audit_unavailable" },
      503,
    );
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Invalid JSON body." }, 400);
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return respond({ error: "Check the review choices and try again." }, 400);
  }
  if (parsed.data.reviewStatus === "approved" && !parsed.data.publicDisclosureApproved) {
    return respond({ error: "Public disclosure approval is required." }, 400);
  }

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) => auditLog.log({
    userId: access.actorId,
    action: "site_admin.subprocessor.review",
    resourceType: "site_admin",
    resourceId: id,
    outcome,
    requestId: correlation.requestId,
    metadata,
  });

  const challenge = await verifyFreshMfaStepUp({
    userId: access.actorId,
    code: parsed.data.mfaCode,
  });
  if (!challenge.ok) {
    try {
      await recordOutcome(challenge.outcome, {
        phase: "step_up",
        reason: `mfa_step_up_${challenge.code}`,
        reviewStatus: parsed.data.reviewStatus,
      });
    } catch {
      return respond({ error: "Audit service unavailable.", code: "audit_unavailable" }, 503);
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return respond(
      {
        error: "A fresh MFA challenge is required before recording this provider review.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    try {
      await recordOutcome("success", {
        phase: "review_authorized",
        reviewStatus: parsed.data.reviewStatus,
        dpaStatus: parsed.data.dpaStatus,
      });
    } catch {
      return respond(
        { error: "The review was not recorded because its access event could not be confirmed.", code: "audit_unavailable" },
        503,
      );
    }

    const result = await withRlsContext(access.rlsContext, async () => {
      const db = getDb();
      const [before] = await db
        .select()
        .from(subprocessorRegistry)
        .where(eq(subprocessorRegistry.id, id))
        .limit(1)
        .for("update");
      if (!before) return { kind: "not_found" as const };
      if (parsed.data.reviewStatus === "approved" && (
        before.createdBy === access.actorId || before.updatedBy === access.actorId
      )) {
        return { kind: "second_admin_required" as const };
      }
      const now = new Date();
      const [record] = await db
        .update(subprocessorRegistry)
        .set({
          reviewStatus: parsed.data.reviewStatus,
          dpaStatus: parsed.data.dpaStatus,
          reviewOwner: parsed.data.reviewOwner,
          publicDisclosureApproved: parsed.data.reviewStatus === "approved" && parsed.data.publicDisclosureApproved,
          reviewedBy: access.actorId,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(subprocessorRegistry.id, id))
        .returning();
      if (!record) return { kind: "write_unconfirmed" as const };
      if (record.reviewStatus !== "approved") {
        await db.delete(subprocessorPublicProjections)
          .where(eq(subprocessorPublicProjections.id, id));
      }
      await db.insert(subprocessorAuditEvents).values({
        id: crypto.randomUUID(),
        actorId: access.actorId,
        providerId: id,
        action: "reviewed",
        beforeRecord: snapshot(before),
        afterRecord: snapshot(record),
      });
      return { kind: "reviewed" as const, record };
    });

    if (result.kind !== "reviewed") {
      if (result.kind === "write_unconfirmed") {
        await recordOutcome("error", {
          phase: "review_result",
          reason: "review_write_returning_empty",
          reviewStatus: parsed.data.reviewStatus,
        }).catch(() => undefined);
        return respond(
          { error: "The review outcome could not be confirmed. Reload the register before trying again.", code: "subprocessor_review_outcome_unconfirmed" },
          503,
        );
      }
      const reason = result.kind === "not_found" ? "provider_not_found" : "second_admin_required";
      try {
        await recordOutcome("denied", {
          phase: "review_result",
          reason,
          reviewStatus: parsed.data.reviewStatus,
        });
      } catch {
        return respond({ error: "Audit service unavailable.", code: "audit_unavailable" }, 503);
      }
      return result.kind === "not_found"
        ? respond({ error: "Provider record not found.", code: "provider_not_found" }, 404)
        : respond({ error: "A second platform administrator must approve this record.", code: "second_admin_required" }, 409);
    }

    try {
      await recordOutcome("success", {
        phase: "review_result",
        reviewStatus: parsed.data.reviewStatus,
        dpaStatus: parsed.data.dpaStatus,
        publicDisclosureApproved: String(parsed.data.reviewStatus === "approved" && parsed.data.publicDisclosureApproved),
      });
    } catch {
      return respond(
        { error: "The review may have been recorded, but its result audit could not be confirmed. Reload the register before trying again.", code: "subprocessor_review_result_unconfirmed" },
        503,
      );
    }
    return respond({ record: result.record });
  } catch {
    await recordOutcome("error", {
      phase: "review_result",
      reason: "review_outcome_unconfirmed",
      reviewStatus: parsed.data.reviewStatus,
    }).catch(() => undefined);
    return respond(
      { error: "The review outcome could not be confirmed. Reload the register before trying again.", code: "subprocessor_review_outcome_unconfirmed" },
      503,
    );
  }
}
