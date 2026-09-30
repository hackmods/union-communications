import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability } from "@/lib/authorization/model";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { canManageLocalModules } from "@/lib/tenant/access";
import { getLocalById, getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { hydrateLocalHall } from "@/lib/portal/hall-roster";
import { getPortalAdapter } from "@/lib/portal/adapter";
import { resolveCircleCreate } from "@/lib/portal/circle-create";
import { parseJsonBody } from "@/lib/validation/parse";
import type { UserRole } from "@/types/tenant";

const bodySchema = z
  .object({
    committeeName: z.string().trim().min(1).max(120).optional(),
    committeeDescription: z.string().trim().max(500).optional(),
    createCommittee: z.boolean().optional(),
  })
  .strict();

/**
 * Hub-side Hall + optional LEC committee starter.
 * Avoids `/api/portal/*` so Configuration can run under Hub MFA without the
 * Portal session gate returning 403 when Portal APIs are restricted.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canManageLocalModules(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }
  if (!localId) {
    return NextResponse.json({ error: "Missing local context" }, { status: 400 });
  }

  let raw: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }
  const createCommittee = parsed.data.createCommittee !== false;

  await hydrateTenantOverlayFromPostgres();
  const tenant = getTenantContext(unionId, localId);
  if (!tenant?.union.enabledModules.includes("portal")) {
    return NextResponse.json(
      { error: "Portal module disabled" },
      { status: 403 },
    );
  }

  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  const rls = rlsContextForActor(session, actor);
  const local = getLocalById(unionId, localId);
  const { circle: hall } = await hydrateLocalHall({
    unionId,
    localId,
    localNumber: local?.localNumber,
    rls,
    currentUser: {
      userId: session.user.id,
      userName: session.user.name ?? "Member",
      admin: decideCapability(actor, "circles.admin", {
        unionId,
        localId,
      }).allowed,
    },
  });

  if (!createCommittee) {
    return NextResponse.json({ hall, circle: null });
  }

  const canCreate = decideCapability(actor, "circles.create", {
    unionId,
    localId,
  }).allowed;
  if (!canCreate) {
    return NextResponse.json(
      { error: "Forbidden", hall },
      { status: 403 },
    );
  }

  const resolved = resolveCircleCreate({
    kind: "committee",
    template: "lec",
    sessionLocalId: localId,
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error, hall }, { status: 400 });
  }

  const portal = await getPortalAdapter(rls);
  const circle = await portal.createCircle({
    unionId,
    localId: resolved.localId,
    kind: resolved.kind,
    name: parsed.data.committeeName?.trim() || "LEC",
    description: parsed.data.committeeDescription?.trim(),
    visibility: resolved.visibility,
    createdById: session.user.id,
    createdByName: session.user.name ?? "Officer",
    template: "lec",
  });

  return NextResponse.json({ hall, circle }, { status: 201 });
}
