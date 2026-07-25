import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  assertPtoApprove,
  assertPtoCancel,
  assertPtoView,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { timeStore } from "@/lib/time/store";
import { parseJsonBody } from "@/lib/validation/parse";

const patchSchema = z.object({
  status: z.enum(["approved", "rejected", "cancelled", "submitted"]),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await ctx.params;
  const existing = await timeStore.getPtoRequestById(id);
  if (!existing || !assertPtoView(authResult.session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(patchSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const next = parsed.data.status;
  if (next === "approved" || next === "rejected") {
    if (!assertPtoApprove(authResult.session, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (next === "cancelled") {
    if (!assertPtoCancel(authResult.session, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (next === "submitted") {
    if (
      existing.status !== "draft" ||
      (existing.workerId !== authResult.session.user.id &&
        existing.requestedById !== authResult.session.user.id)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const updated = await timeStore.updatePtoRequestStatus(id, next, {
    approvedById: authResult.session.user.id,
  });
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }

  const action =
    next === "approved"
      ? "time.pto.approve"
      : next === "rejected"
        ? "time.pto.reject"
        : next === "cancelled"
          ? "time.pto.cancel"
          : "time.pto.submit";

  await auditLog.log({
    userId: authResult.session.user.id,
    action,
    resourceType: "pto_request",
    resourceId: updated.id,
    unionId: updated.unionId,
    localId: updated.localId,
  });

  return NextResponse.json({ request: updated });
}
