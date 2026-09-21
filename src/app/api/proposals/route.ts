import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import {
  canWriteProposalsForSession,
  proposalsListScope,
  requireProposalsSession,
} from "@/lib/auth/proposals-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { proposalsStore } from "@/lib/hub-governance/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { PROPOSAL_STATUSES } from "@/lib/proposal-tracker/types";

const createPackageSchema = z.object({
  name: z.string().min(1).max(200),
  roundLabel: z.string().max(80).optional().default(""),
  status: z.enum(["active", "closed", "archived"]).optional().default("active"),
  caucusNote: z.string().max(4000).optional().default(""),
  rows: z
    .array(
      z.object({
        id: z.string().optional(),
        article: z.string().max(300).optional().default(""),
        currentLanguage: z.string().max(6000).optional().default(""),
        unionProposal: z.string().max(6000).optional().default(""),
        employerCounter: z.string().max(6000).optional().default(""),
        status: z.enum(PROPOSAL_STATUSES).optional().default("open"),
        notes: z.string().max(4000).optional().default(""),
        sortOrder: z.number().int().min(0).optional().default(0),
        assigneeIds: z.array(z.string()).optional().default([]),
      }),
    )
    .optional()
    .default([]),
});

export async function GET() {
  const authResult = await requireProposalsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const scope = proposalsListScope(session);
  const rlsCtx = await rlsContextForSession(session) ?? {};
  const packages = await withRlsContext(rlsCtx, () =>
    proposalsStore.listPackages(scope.unionId, scope.localId),
  );

  await auditLog.log({
    userId: session.user.id,
    action: "proposals.list",
    resourceType: "proposal_package",
    resourceId: "*",
    unionId: scope.unionId,
    localId: scope.localId,
  });

  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
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
  if (!session.user.unionId || !session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(createPackageSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const unionId = session.user.unionId!;
  const localId = session.user.localId!;
  const rlsCtx = await rlsContextForSession(session) ?? {};

  const pkg = await withRlsContext(rlsCtx, () =>
    proposalsStore.createPackage({
      unionId,
      localId,
      name: parsed.data.name,
      roundLabel: parsed.data.roundLabel,
      status: parsed.data.status,
      caucusNote: parsed.data.caucusNote,
      createdById: session.user.id,
      updatedById: session.user.id,
    }),
  );

  if (parsed.data.rows.length > 0) {
    await withRlsContext(rlsCtx, () =>
      Promise.all(
        parsed.data.rows.map((row, index) =>
          proposalsStore.upsertRow({
            id: row.id ?? `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
            packageId: pkg.id,
            unionId,
            localId,
            article: row.article,
            currentLanguage: row.currentLanguage,
            unionProposal: row.unionProposal,
            employerCounter: row.employerCounter,
            status: row.status,
            notes: row.notes,
            sortOrder: row.sortOrder ?? index,
            assigneeIds: row.assigneeIds,
          }),
        ),
      ),
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "proposals.create",
    resourceType: "proposal_package",
    resourceId: pkg.id,
    unionId,
    localId,
  });

  return NextResponse.json({ package: pkg }, { status: 201 });
}