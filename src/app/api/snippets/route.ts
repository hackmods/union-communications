import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canManageQolContent } from "@/lib/qol/access";
import { snippetStore } from "@/lib/snippets/store";
import { canAccessSnippetLocalScope, canCreateSnippetInScope } from "@/lib/snippets/access";
import { normalizeSnippetText } from "@/lib/snippets/text-normalize";
import { isSnippetLibraryId } from "@/lib/snippets/libraries";
import { isCrossLocalAdministrator } from "@/lib/authorization/model";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }
  if (!canAccessSnippetLocalScope(actor, actor.activeLocalId)) {
    return NextResponse.json({ error: "Local membership required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const libraryParam = url.searchParams.get("library");
  const localeParam = url.searchParams.get("locale");

  let libraryId = libraryParam || undefined;
  if (!libraryId && actor.bargainingUnitId) {
    const { getBargainingUnitById } = await import("@/lib/tenant/loader");
    const { defaultLibraryForBargainingUnitCode } = await import(
      "@/lib/snippets/libraries"
    );
    const unit = getBargainingUnitById(
      session.user.unionId!,
      actor.bargainingUnitId,
    );
    libraryId = defaultLibraryForBargainingUnitCode(unit?.code);
  }

  const snippets = await snippetStore.list({
    unionId,
    localId: isCrossLocalAdministrator(actor) ? undefined : actor.activeLocalId,
    bargainingUnitId: isCrossLocalAdministrator(actor)
      ? undefined
      : actor.bargainingUnitId,
    query,
    libraryId,
    locale: localeParam === "fr" || localeParam === "en" ? localeParam : "en",
  });

  await auditLog.log({
    userId: session.user.id,
    action: "snippet.list",
    resourceType: "ca_snippet",
    resourceId: "*",
    unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ snippets });
}

export async function POST(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const roles = actor.roles as UserRole[];
  if (!canManageQolContent(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }

  const body = await request.json();
  const {
    title,
    clauseRef,
    body: snippetBody,
    tags,
    localId,
    bargainingUnitId,
    libraryId,
    locale,
  } = body;
  if (!title || !clauseRef || !snippetBody) {
    return NextResponse.json(
      { error: "title, clauseRef, and body are required" },
      { status: 400 },
    );
  }

  const requestedLocalId = localId ?? actor.activeLocalId;
  const requestedBargainingUnitId = bargainingUnitId ?? actor.bargainingUnitId;
  if (!canCreateSnippetInScope(actor, requestedLocalId, requestedBargainingUnitId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snippet = await snippetStore.create(
    {
      title: normalizeSnippetText(String(title)),
      clauseRef: normalizeSnippetText(String(clauseRef)),
      body: normalizeSnippetText(String(snippetBody)),
      tags: Array.isArray(tags)
        ? tags.map((t: unknown) => normalizeSnippetText(String(t))).filter(Boolean)
        : [],
      localId: requestedLocalId,
      bargainingUnitId: requestedBargainingUnitId,
      libraryId: isSnippetLibraryId(libraryId) ? libraryId : undefined,
      locale: locale === "fr" || locale === "en" ? locale : "en",
    },
    {
      unionId,
      createdById: session.user.id,
      createdByName: session.user.name ?? session.user.email ?? "Officer",
    },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "snippet.create",
    resourceType: "ca_snippet",
    resourceId: snippet.id,
    unionId,
    localId: snippet.localId,
  });

  return NextResponse.json({ snippet }, { status: 201 });
}
