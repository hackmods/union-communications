import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import {
  canPublishProposalsForSession,
  requireProposalsSession,
} from "@/lib/auth/proposals-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { proposalsStore } from "@/lib/hub-governance/store";
import { parseJsonBody } from "@/lib/validation/parse";

const publishSchema = z.object({
  headline: z.string().min(1).max(200),
  bullets: z.array(z.string().min(1).max(1000)).max(12).default([]),
  guideHref: z.string().max(300).optional(),
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
  const rlsCtx = rlsContextForSession(session) ?? {};
  const pkg = await withRlsContext(rlsCtx, () => proposalsStore.getPackage(id));
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const publications = await withRlsContext(rlsCtx, () =>
    proposalsStore.listPublications(pkg.unionId, pkg.localId),
  );
  return NextResponse.json({
    publications: publications.filter((p) => p.packageId === id),
  });
}

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
  if (!canPublishProposalsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(publishSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const rlsCtx = rlsContextForSession(session) ?? {};
  const pkg = await withRlsContext(rlsCtx, () => proposalsStore.getPackage(id));
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const publication = await withRlsContext(rlsCtx, () =>
    proposalsStore.publish({
      packageId: id,
      unionId: pkg.unionId,
      localId: pkg.localId,
      headline: parsed.data.headline,
      bullets: parsed.data.bullets,
      guideHref: parsed.data.guideHref,
      publishedById: session.user.id,
    }),
  );

  // The published snapshot becomes the package's member-safe summary.
  await withRlsContext(rlsCtx, () =>
    proposalsStore.updatePackage(id, {
      publishedAt: publication.publishedAt,
      publishedSummary: {
        headline: publication.headline,
        bullets: publication.bullets,
        guideHref: publication.guideHref,
      },
      updatedById: session.user.id,
    }),
  );

  await auditLog.log({
    userId: session.user.id,
    action: "proposals.publish",
    resourceType: "proposal_package",
    resourceId: id,
    unionId: pkg.unionId,
    localId: pkg.localId,
  });

  return NextResponse.json({ publication }, { status: 201 });
}