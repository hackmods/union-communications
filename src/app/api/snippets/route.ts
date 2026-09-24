import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canManageQolContent } from "@/lib/qol/access";
import { ensureReferencePacksIfEmpty } from "@/lib/snippets/ensure-seeded";
import { snippetStore } from "@/lib/snippets/store";
import { canAccessSnippetLocalScope, canCreateSnippetInScope } from "@/lib/snippets/access";
import { normalizeSnippetText } from "@/lib/snippets/text-normalize";
import { isSnippetLibraryId } from "@/lib/snippets/libraries";
import {
  getPreferredSnippetLibrary,
  resolvePreferredOrDefaultLibrary,
} from "@/lib/snippets/preferred-library";
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

  // First visit / empty union → restore shipped packs (idempotent).
  const ensure = await ensureReferencePacksIfEmpty(unionId);

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const libraryParam = url.searchParams.get("library");
  const localeParam = url.searchParams.get("locale");

  let collectionCode: string | null | undefined;
  if (actor.bargainingUnitId) {
    const { getBargainingUnitById } = await import("@/lib/tenant/loader");
    const unit = getBargainingUnitById(unionId, actor.bargainingUnitId);
    collectionCode = unit?.code;
  }

  const libraryId = resolvePreferredOrDefaultLibrary({
    unionId,
    localId: actor.activeLocalId,
    bargainingUnitId: actor.bargainingUnitId,
    collectionCode,
    explicit: libraryParam,
  });

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

  return NextResponse.json({
    snippets,
    preferredLibrary: getPreferredSnippetLibrary(
      unionId,
      actor.activeLocalId,
      actor.bargainingUnitId,
    ),
    activeLibrary: libraryId,
    ensure,
  });
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
