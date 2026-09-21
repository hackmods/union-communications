import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { requireProposalsSession } from "@/lib/auth/proposals-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { proposalsStore } from "@/lib/hub-governance/store";
import { parseJsonBody } from "@/lib/validation/parse";

const archiveSchema = z.object({
  archived: z.literal(true),
});

/** Unpublish: hide a proposal publication from the member-facing Portal. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProposalsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const { id } = await params;

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(archiveSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const ok = await withRlsContext(rlsCtx, () =>
    proposalsStore.archivePublication(id),
  );
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "proposals.unpublish",
    resourceType: "proposal_package",
    resourceId: id,
    unionId: session.user.unionId ?? "__none__",
    localId: undefined,
  });

  return NextResponse.json({ ok: true });
}