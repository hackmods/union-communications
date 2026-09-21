import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decideCapability, type Capability } from "@/lib/authorization/model";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";

const CAPABILITIES: Capability[] = [
  "memberships.manage",
  "officers.manage",
  "delegations.manage",
  "circles.create",
  "circles.admin",
  "grievances.summary.read",
  "grievances.case.read",
  "grievances.case.write",
  "grievances.access.manage",
  "grievances.member_updates.publish",
  "tenant.configure",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.unionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const localId = new URL(request.url).searchParams.get("localId") ?? session.user.localId;
  if (!localId) return NextResponse.json({ error: "Local context required" }, { status: 400 });
  const hasMembership = actor.memberships.some((membership) => membership.unionId === actor.unionId && membership.localId === localId);
  const hasOrganizationAuthority = ["memberships.manage", "officers.manage", "delegations.manage"].some((capability) =>
    decideCapability(actor, capability as Capability, { unionId: actor.unionId, localId }).allowed,
  );
  if (!hasMembership && !hasOrganizationAuthority) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const decisions = CAPABILITIES.map((capability) => {
    const decision = decideCapability(actor, capability, { unionId: actor.unionId, localId });
    return { capability, allowed: decision.allowed, reason: decision.reason };
  });
  return NextResponse.json({
    localId,
    memberships: actor.memberships.filter((membership) => membership.unionId === actor.unionId),
    offices: hasMembership ? actor.assignments.filter((assignment) => assignment.unionId === actor.unionId && assignment.localId === localId) : [],
    delegations: hasMembership ? actor.delegations.filter((delegation) => delegation.unionId === actor.unionId && delegation.localId === localId) : [],
    capabilities: decisions.filter((decision) => decision.allowed),
  });
}
