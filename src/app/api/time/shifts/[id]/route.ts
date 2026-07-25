import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  assertShiftMutate,
  assertShiftView,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { timeStore } from "@/lib/time/store";
import { parseJsonBody } from "@/lib/validation/parse";

const patchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().min(1).optional(),
  category: z
    .enum(["staff", "release", "duty_bank", "action", "volunteer"])
    .optional(),
  siteId: z.string().min(1).max(120).nullable().optional(),
  jobCodeId: z.string().min(1).max(120).nullable().optional(),
  assignedWorkerIds: z.array(z.string().min(1).max(120)).max(200).optional(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
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
  const existing = await timeStore.getShiftById(id);
  if (!existing || !assertShiftView(authResult.session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertShiftMutate(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  try {
    const updated = await timeStore.updateShift(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }

    await auditLog.log({
      userId: authResult.session.user.id,
      action: "time.shifts.update",
      resourceType: "time_shift",
      resourceId: updated.id,
      unionId: updated.unionId,
      localId: updated.localId,
    });

    return NextResponse.json({ shift: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
