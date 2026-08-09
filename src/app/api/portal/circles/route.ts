import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { canCreateCircle } from "@/lib/portal/access";
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
    template?: "blank" | "lec" | "jhsc" | "campaign";
    frontStartsAt?: string;
    frontEndsAt?: string;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const kind =
    body.kind ??
    (body.template === "campaign" ? "campaign" : "committee");
  const circle = portalStore.createCircle({
    unionId: session.user.unionId!,
    localId: session.user.localId,
    kind,
    name: body.name.trim(),
    description: body.description?.trim(),
    visibility: body.visibility ?? "invited",
    createdById: session.user.id,
    createdByName: session.user.name ?? "Officer",
    template: body.template ?? "blank",
    frontStartsAt: body.frontStartsAt,
    frontEndsAt: body.frontEndsAt,
  });
  return NextResponse.json({ circle }, { status: 201 });
}
