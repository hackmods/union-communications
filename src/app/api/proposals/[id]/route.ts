import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import {
  canWriteProposalsForSession,
  loadProposalPackageScoped,
  requireProposalsSession,
} from "@/lib/auth/proposals-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { proposalsStore } from "@/lib/hub-governance/store";
import { parseJsonBody } from "@/lib/validation/parse";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  roundLabel: z.string().max(80).optional(),
  status: z.enum(["active", "closed", "archived"]).optional(),
  caucusNote: z.string().max(4000).optional(),
});

export async function GET(
  _request: Request,
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
  const pkg = await loadProposalPackageScoped(id, session);
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rlsCtx = await rlsContextForSession(session) ?? {};
  const [rows, events, publications] = await withRlsContext(rlsCtx, () =>
    Promise.all([
      proposalsStore.listRows(id),
      proposalsStore.listEvents(id),
      proposalsStore.listPublications(pkg.unionId, pkg.localId),
    ]),
  );
  return NextResponse.json({
    package: pkg,
    rows,
    events,
    publications,
  });
}

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
  if (!canWriteProposalsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
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

  const statusChanged =
    parsed.data.status !== undefined && parsed.data.status !== pkg.status;

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const updated = await withRlsContext(rlsCtx, () =>
    proposalsStore.updatePackage(id, {
      ...parsed.data,
      updatedById: session.user.id,
    }),
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (statusChanged) {
    await withRlsContext(rlsCtx, () =>
      proposalsStore.addEvent({
        packageId: id,
        unionId: updated.unionId,
        localId: updated.localId,
        authorId: session.user.id,
        authorName: session.user.name ?? "Officer",
        kind: "system",
        body: `Package status changed to ${parsed.data.status}`,
      }),
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "proposals.update",
    resourceType: "proposal_package",
    resourceId: id,
    unionId: updated.unionId,
    localId: updated.localId,
  });

  return NextResponse.json({ package: updated });
}

export async function DELETE(
  _request: Request,
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
  const rlsCtx = await rlsContextForSession(session) ?? {};
  await withRlsContext(rlsCtx, () => proposalsStore.removePackage(id));

  await auditLog.log({
    userId: session.user.id,
    action: "proposals.delete",
    resourceType: "proposal_package",
    resourceId: id,
    unionId: pkg.unionId,
    localId: pkg.localId,
  });

  return NextResponse.json({ ok: true });
}