import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canManageQolContent } from "@/lib/qol/access";
import { snippetStore } from "@/lib/snippets/memory-adapter";
import type { UserRole } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const snippet = await snippetStore.getById(id);
  if (!snippet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (snippet.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ snippet });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canManageQolContent(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await snippetStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updated = await snippetStore.update(id, body);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "snippet.update",
    resourceType: "ca_snippet",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ snippet: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canManageQolContent(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await snippetStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await snippetStore.remove(id);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "snippet.delete",
    resourceType: "ca_snippet",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
