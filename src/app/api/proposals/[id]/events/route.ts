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

const eventSchema = z.object({
  kind: z.enum(["comment", "status", "system"]).optional().default("comment"),
  body: z.string().min(1).max(4000),
  rowId: z.string().optional(),
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
  const parsed = parseJsonBody(eventSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const rlsCtx = await rlsContextForSession(session) ?? {};

  const event = await withRlsContext(rlsCtx, () =>
    proposalsStore.addEvent({
      packageId: id,
      rowId: parsed.data.rowId,
      unionId: pkg.unionId,
      localId: pkg.localId,
      authorId: session.user.id,
      authorName: session.user.name ?? "Officer",
      kind: parsed.data.kind,
      body: parsed.data.body,
    }),
  );

  return NextResponse.json({ event }, { status: 201 });
}