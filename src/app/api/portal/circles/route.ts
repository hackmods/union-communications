import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { canCreateCircle } from "@/lib/portal/access";
import {
  resolveCircleCreate,
  type CircleCreateScope,
} from "@/lib/portal/circle-create";
import type { UserRole } from "@/types/tenant";
import type { CircleKind, CircleVisibility } from "@/types/portal";

export async function POST(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canCreateCircle(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    kind?: CircleKind;
    visibility?: CircleVisibility;
    scope?: CircleCreateScope;
    template?: "blank" | "lec" | "jhsc" | "campaign";
    frontStartsAt?: string;
    frontEndsAt?: string;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const resolved = resolveCircleCreate({
    kind: body.kind,
    template: body.template,
    visibility: body.visibility,
    scope: body.scope,
    sessionLocalId: session.user.localId,
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const circle = portalStore.createCircle({
    unionId: session.user.unionId!,
    localId: resolved.localId,
    kind: resolved.kind,
    name: body.name.trim(),
    description: body.description?.trim(),
    visibility: resolved.visibility,
    createdById: session.user.id,
    createdByName: session.user.name ?? "Officer",
    template: body.template ?? "blank",
    frontStartsAt: body.frontStartsAt,
    frontEndsAt: body.frontEndsAt,
  });
  return NextResponse.json({ circle }, { status: 201 });
}
