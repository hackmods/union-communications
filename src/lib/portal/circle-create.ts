import type { CircleKind, CircleVisibility } from "@/types/portal";
import type { AuthorizationActor } from "@/lib/authorization/model";

/** A local president may start an invited cross-local Circle without gaining any other local's records. */
export function canCreateUnionScopedCircle(actor: AuthorizationActor, unionId: string): boolean {
  if (!actor.accountActive || actor.unionId !== unionId) return false;
  if (actor.roles.includes("platform_admin") || actor.roles.includes("union_admin")) return true;
  const localId = actor.activeLocalId;
  return Boolean(localId &&
    actor.memberships.some((membership) => membership.unionId === unionId && membership.localId === localId) &&
    actor.assignments.some((assignment) => assignment.unionId === unionId && assignment.localId === localId &&
      ["president", "vice_president"].includes(assignment.position)));
}

export type CircleCreateScope = "local" | "union";
export type CircleCreateTemplate = "blank" | "lec" | "jhsc" | "campaign";

export type ResolveCircleCreateInput = {
  kind?: CircleKind;
  template?: CircleCreateTemplate;
  visibility?: CircleVisibility;
  scope?: CircleCreateScope;
  sessionLocalId?: string;
};

export type ResolveCircleCreateResult =
  | {
      ok: true;
      kind: CircleKind;
      visibility: CircleVisibility;
      localId?: string;
    }
  | { ok: false; error: string };

/**
 * Hall stays local. Invited committee / campaign / ad-hoc Circles may omit
 * `localId` so members from more than one local can share a caucus.
 */
export function resolveCircleCreate(
  input: ResolveCircleCreateInput,
): ResolveCircleCreateResult {
  const kind: CircleKind =
    input.kind ??
    (input.template === "campaign" ? "campaign" : "committee");

  if (kind === "local_hall") {
    return { ok: false, error: "Use Hall ensure for the local Hall." };
  }

  const scope: CircleCreateScope = input.scope === "union" ? "union" : "local";
  const visibility: CircleVisibility = input.visibility ?? "invited";

  if (scope === "union") {
    if (visibility === "local_members") {
      return {
        ok: false,
        error: "A Circle for more than one local must stay invite-only.",
      };
    }
    return { ok: true, kind, visibility, localId: undefined };
  }

  const localId = input.sessionLocalId?.trim();
  if (!localId) {
    return { ok: false, error: "Local required" };
  }

  return { ok: true, kind, visibility, localId };
}
