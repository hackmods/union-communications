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

export const rowSchema = z.object({
  id: z.string().optional(),
  article: z.string().max(300).optional().default(""),
  currentLanguage: z.string().max(6000).optional().default(""),
  unionProposal: z.string().max(6000).optional().default(""),
  employerCounter: z.string().max(6000).optional().default(""),
  status: z.enum(PROPOSAL_STATUSES).optional().default("open"),
  notes: z.string().max(4000).optional().default(""),
  sortOrder: z.number().int().min(0).optional().default(0),
  assigneeIds: z.array(z.string()).optional().default([]),
});

export async function POST(
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
  if (!canWriteProposalsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const pkg = await loadProposalPackageScoped(id, session);
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(rowSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const row = await withRlsContext(rlsCtx, () =>
    proposalsStore.upsertRow({
      id:
        parsed.data.id ??
        `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      packageId: id,
      unionId: pkg.unionId,
      localId: pkg.localId,
      article: parsed.data.article,
      currentLanguage: parsed.data.currentLanguage,
      unionProposal: parsed.data.unionProposal,
      employerCounter: parsed.data.employerCounter,
      status: parsed.data.status,
      notes: parsed.data.notes,
      sortOrder: parsed.data.sortOrder,
      assigneeIds: parsed.data.assigneeIds,
    }),
  );

  return NextResponse.json({ row }, { status: 201 });
}