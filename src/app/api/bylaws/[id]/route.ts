import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  bylawsScopedForSession,
  canWriteBylawsForSession,
  requireBylawsSession,
} from "@/lib/auth/bylaws-session";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { bylawsStore } from "@/lib/hub-governance/store";
import { parseJsonBody } from "@/lib/validation/parse";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  mode: z.enum(["template", "committee"]).optional(),
  status: z
    .enum(["draft", "committee", "pending_gmm", "adopted", "archived"])
    .optional(),
  form: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireBylawsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const { id } = await params;

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const draft = await withRlsContext(rlsCtx, () => bylawsStore.get(id));
  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!bylawsScopedForSession(session, draft)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ draft });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireBylawsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  if (!canWriteBylawsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(patchSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const draft = await withRlsContext(rlsCtx, () =>
    bylawsStore.update(id, {
      ...parsed.data,
      form: parsed.data.form as Parameters<
        typeof bylawsStore.update
      >[1]["form"],
      updatedById: session.user.id,
    }),
  );
  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!bylawsScopedForSession(session, draft)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "bylaws.update",
    resourceType: "bylaw_draft",
    resourceId: draft.id,
    unionId: draft.unionId,
    localId: draft.localId,
  });

  return NextResponse.json({ draft });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireBylawsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  if (!canWriteBylawsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const rlsCtx = await rlsContextForSession(session) ?? {};
  const existing = await withRlsContext(rlsCtx, () => bylawsStore.get(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!bylawsScopedForSession(session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await withRlsContext(rlsCtx, () => bylawsStore.remove(id));

  await auditLog.log({
    userId: session.user.id,
    action: "bylaws.delete",
    resourceType: "bylaw_draft",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}