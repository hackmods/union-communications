import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { canDeleteSharedContent, canManageQolContent } from "@/lib/qol/access";
import { snippetStore } from "@/lib/snippets/store";
import type { UpdateCaSnippetInput } from "@/types/qol";
import type { UserRole } from "@/types/tenant";
import { canManageSnippet, canViewSnippet } from "@/lib/snippets/access";
import { normalizeSnippetText } from "@/lib/snippets/text-normalize";

type RouteContext = { params: Promise<{ id: string }> };

function rlsFromSession(session: {
  user: { unionId?: string | null; localId?: string | null };
}) {
  return {
    unionId: session.user.unionId!,
    localId: session.user.localId ?? undefined,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const snippet = await withRlsContext(rlsFromSession(authResult.session), () =>
    snippetStore.getById(id),
  );
  if (!snippet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (snippet.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canViewSnippet(authResult.actor, snippet)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const existing = await withRlsContext(rlsFromSession(authResult.session), () =>
    snippetStore.getById(id),
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canManageSnippet(authResult.actor, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = await request.json();
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const patch: UpdateCaSnippetInput = {};
  if (typeof body.title === "string") {
    patch.title = normalizeSnippetText(body.title);
  }
  if (typeof body.clauseRef === "string") {
    patch.clauseRef = normalizeSnippetText(body.clauseRef);
  }
  if (typeof body.body === "string") {
    patch.body = normalizeSnippetText(body.body);
  }
  if (
    Array.isArray(body.tags) &&
    body.tags.every((tag) => typeof tag === "string")
  ) {
    patch.tags = body.tags
      .map((tag) => normalizeSnippetText(tag))
      .filter(Boolean);
  }
  const updated = await withRlsContext(rlsFromSession(authResult.session), () =>
    snippetStore.update(id, patch),
  );
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
  const existing = await withRlsContext(rlsFromSession(authResult.session), () =>
    snippetStore.getById(id),
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canManageSnippet(authResult.actor, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    !canDeleteSharedContent(
      roles,
      existing.createdById,
      authResult.session.user.id,
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await withRlsContext(rlsFromSession(authResult.session), () =>
    snippetStore.remove(id),
  );
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
