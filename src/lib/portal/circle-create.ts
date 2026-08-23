import type { CircleKind, CircleVisibility } from "@/types/portal";

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
