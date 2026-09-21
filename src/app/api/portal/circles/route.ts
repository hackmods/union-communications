import { requirePortalSession } from "@/lib/portal/portal-session";
import { getPortalAdapter } from "@/lib/portal/adapter";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import {
  resolveCircleCreate,
  type CircleCreateScope,
} from "@/lib/portal/circle-create";
import { portalJson } from "@/lib/portal/portal-json";
import type { CircleKind, CircleVisibility } from "@/types/portal";

export async function POST(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
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
    return portalJson({ error: "Name required" }, { status: 400 });
  }
  const resolved = resolveCircleCreate({
    kind: body.kind,
    template: body.template,
    visibility: body.visibility,
    scope: body.scope,
    sessionLocalId: session.user.localId,
  });
  if (!resolved.ok) {
    return portalJson({ error: resolved.error }, { status: 400 });
  }
  if (!decideCapability(actor, "circles.create", { unionId: session.user.unionId!, localId: resolved.localId }).allowed) {
    return portalJson({ error: "Forbidden" }, { status: 403 });
  }
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const circle = await portal.createCircle({
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
  return portalJson({ circle }, { status: 201 });
}
