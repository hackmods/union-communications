import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canManageQolContent } from "@/lib/qol/access";
import { snippetStore } from "@/lib/snippets/memory-adapter";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;

  const snippets = await snippetStore.list({
    unionId,
    localId: session.user.localId,
    query,
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

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canManageQolContent(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }

  const body = await request.json();
  const { title, clauseRef, body: snippetBody, tags, localId } = body;
  if (!title || !clauseRef || !snippetBody) {
    return NextResponse.json(
      { error: "title, clauseRef, and body are required" },
      { status: 400 },
    );
  }

  const snippet = await snippetStore.create(
    {
      title,
      clauseRef,
      body: snippetBody,
      tags: Array.isArray(tags) ? tags : [],
      localId: localId ?? session.user.localId,
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
