import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { assignUserLocal } from "@/lib/tenant/assign-local";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  unionId: z.string().min(1).optional(),
  newUnionName: z.string().min(1).max(200).optional(),
  localId: z.string().min(1).optional(),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
  bargainingUnitId: z.string().nullable().optional(),
  setPrimary: z.boolean().optional(),
  replaceActiveMembership: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/site-admin/users/[id]/assign-local
 *
 * Restore or reassign a user's union/local membership (platform_admin).
 */
export async function POST(req: Request, { params }: Params) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Postgres is not configured" },
      { status: 503 },
    );
  }

  const { id: targetUserId } = await params;
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  try {
    const result = await assignUserLocal({
      actorUserId: gate.session.user.id,
      targetUserId,
      ...parsed.data,
      setPrimary: parsed.data.setPrimary ?? true,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          conflictingLocalIds: result.conflictingLocalIds,
        },
        { status: result.status },
      );
    }

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.user.assign_local",
      resourceType: "site_admin",
      resourceId: targetUserId,
      unionId: result.unionId,
      localId: result.localId,
      metadata: {
        membershipId: result.membershipId,
        createdLocal: String(result.createdLocal),
        createdUnion: String(result.createdUnion),
        replaced: String(result.replacedMembershipIds.length),
      },
    });

    return NextResponse.json({ ...result });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/users/[id]/assign-local");
    // #region agent log
    const nested = err as {
      message?: string;
      cause?: {
        message?: string;
        code?: string;
        detail?: string;
        constraint?: string;
      };
    };
    const causeMessage = nested?.cause?.message ?? null;
    const causeCode = nested?.cause?.code ?? null;
    const causeConstraint = nested?.cause?.constraint ?? null;
    fetch("http://127.0.0.1:7911/ingest/3d68b2c0-ac88-4c57-b4e8-72926e068c79", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9d35a6",
      },
      body: JSON.stringify({
        sessionId: "9d35a6",
        runId: "post-fix",
        hypothesisId: "A-RLS",
        location: "assign-local/route.ts:catch",
        message: "assign-local API caught error",
        data: {
          targetUserId,
          message: nested?.message ?? String(err),
          causeMessage,
          causeCode,
          causeConstraint,
          causeDetail: nested?.cause?.detail ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Assign local failed",
        // Temporary debug payload for assign-local failure diagnosis.
        debug: {
          causeMessage,
          causeCode,
          causeConstraint,
        },
      },
      { status: 500 },
    );
  }
}
