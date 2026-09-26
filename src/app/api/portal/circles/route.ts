import { requirePortalSession } from "@/lib/portal/portal-session";
import { getPortalAdapter } from "@/lib/portal/adapter";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import {
  resolveCircleCreate,
  canCreateUnionScopedCircle,
  type CircleCreateScope,
} from "@/lib/portal/circle-create";
import { portalJson } from "@/lib/portal/portal-json";
import { getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
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
    divisionId?: string;
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
  await hydrateTenantOverlayFromPostgres();
  const tenant = getTenantContext(session.user.unionId!, session.user.localId);
  if (body.divisionId && !tenant?.divisions.some((division) => division.id === body.divisionId)) {
    return portalJson({ error: "Bargaining collective not found" }, { status: 404 });
  }
  if (resolved.localId && body.divisionId && tenant?.locals.find((local) => local.id === resolved.localId)?.divisionId !== body.divisionId) {
    return portalJson({ error: "Local is outside this bargaining collective" }, { status: 400 });
  }
  const canCreate = resolved.localId
    ? decideCapability(actor, "circles.create", { unionId: session.user.unionId!, localId: resolved.localId }).allowed
    : canCreateUnionScopedCircle(actor, session.user.unionId!);
  if (!canCreate) {
    return portalJson({ error: "Forbidden" }, { status: 403 });
  }
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const circle = await portal.createCircle({
    unionId: session.user.unionId!,
    localId: resolved.localId,
    divisionId: body.divisionId,
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
