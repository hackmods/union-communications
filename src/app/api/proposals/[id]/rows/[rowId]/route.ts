import { NextResponse } from "next/server";
import { z } from "zod";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import {
  canWriteProposalsForSession,
  loadProposalPackageScoped,
  requireProposalsSession,
} from "@/lib/auth/proposals-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { proposalsStore } from "@/lib/hub-governance/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { PROPOSAL_STATUSES } from "@/lib/proposal-tracker/types";

const patchSchema = z.object({
  article: z.string().max(300).optional(),
  currentLanguage: z.string().max(6000).optional(),
  unionProposal: z.string().max(6000).optional(),
  employerCounter: z.string().max(6000).optional(),
  status: z.enum(PROPOSAL_STATUSES).optional(),
  notes: z.string().max(4000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> },
) {
  const authResult = await requireProposalsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  if (!canWriteProposalsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, rowId } = await params;
  const pkg = await loadProposalPackageScoped(id, session);
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(patchSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const existing = await withRlsContext(rlsCtx, () =>
    proposalsStore.listRows(id).then((rows) => rows.find((r) => r.id === rowId)),
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const statusChanged =
    parsed.data.status !== undefined && parsed.data.status !== existing.status;

  const updated = await withRlsContext(rlsCtx, () =>
    proposalsStore.upsertRow({
      ...existing,
      ...parsed.data,
      assigneeIds: parsed.data.assigneeIds ?? existing.assigneeIds,
    }),
  );

  if (statusChanged && session.user.unionId) {
    await withRlsContext(rlsCtx, () =>
      proposalsStore.addEvent({
        packageId: id,
        rowId,
        unionId: existing.unionId,
        localId: existing.localId,
        authorId: session.user.id,
        authorName: session.user.name ?? "Officer",
        kind: "status",
        body: `Status changed to ${parsed.data.status}`,
      }),
    );
  }

  return NextResponse.json({ row: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> },
) {
  const authResult = await requireProposalsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  if (!canWriteProposalsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, rowId } = await params;
  const pkg = await loadProposalPackageScoped(id, session);
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const rows = await withRlsContext(rlsCtx, () => proposalsStore.listRows(id));
  const existing = rows.find((r) => r.id === rowId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await withRlsContext(rlsCtx, () => proposalsStore.removeRow(rowId));
  return NextResponse.json({ ok: true });
}