import { isCrossLocalAdministrator, type AuthorizationActor } from "@/lib/authorization/model";
import type { CaSnippet } from "@/types/qol";

export function canAccessSnippetLocalScope(
  actor: AuthorizationActor,
  localId: string | undefined,
): boolean {
  if (!actor.accountActive || !actor.unionId) return false;
  if (isCrossLocalAdministrator(actor)) return true;
  if (!localId) return false;
  return actor.memberships.some(
    (membership) =>
      membership.unionId === actor.unionId && membership.localId === localId,
  );
}

export function canViewSnippet(
  actor: AuthorizationActor,
  snippet: CaSnippet,
): boolean {
  if (snippet.unionId !== actor.unionId) return false;
  if (!canAccessSnippetLocalScope(actor, actor.activeLocalId)) return false;
  if (isCrossLocalAdministrator(actor)) return true;
  return !snippet.localId || snippet.localId === actor.activeLocalId;
}

/** Local officers can manage only snippets owned by their active local. */
export function canManageSnippet(
  actor: AuthorizationActor,
  snippet: CaSnippet,
): boolean {
  if (snippet.unionId !== actor.unionId) return false;
  if (isCrossLocalAdministrator(actor)) return actor.accountActive;
  return Boolean(
    snippet.localId &&
      snippet.localId === actor.activeLocalId &&
      canAccessSnippetLocalScope(actor, actor.activeLocalId),
  );
}

export function canCreateSnippetInScope(
  actor: AuthorizationActor,
  localId: string | undefined,
  bargainingUnitId: string | undefined,
): boolean {
  if (!canAccessSnippetLocalScope(actor, actor.activeLocalId)) return false;
  if (isCrossLocalAdministrator(actor)) return true;
  if (!localId || localId !== actor.activeLocalId) return false;
  const membership = actor.memberships.find(
    (row) => row.unionId === actor.unionId && row.localId === actor.activeLocalId,
  );
  return !membership?.bargainingUnitId || !bargainingUnitId || membership.bargainingUnitId === bargainingUnitId;
}
