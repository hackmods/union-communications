import type { AuthorizationActor } from "@/lib/authorization/model";
import { scopeSchema } from "@/lib/customization/schemas";
import { resolveScopeChain } from "@/lib/customization/scope";
import { stricterAudience } from "@/lib/customization/merge";
import type { Audience, CustomizationPolicy, CustomizationScope } from "@/lib/customization/types";

export interface ReaderPolicyInput {
  actor: AuthorizationActor | null;
  target: CustomizationScope;
  /** Trusted directory needed to check division membership through a local. */
  scopes: readonly unknown[];
  /** Actual tenant local relationships, including ancestor archival state. */
  locals: readonly { unionId: string; localId: string; divisionId?: string; active: boolean }[];
  policies: readonly CustomizationPolicy[];
  audience?: Audience;
  withdrawn?: boolean;
  toolEnabled?: boolean;
  moduleEnabled?: boolean;
  entitled?: boolean;
  allowDemoActor?: boolean;
}
export type ReaderDecision = { allowed: boolean; reason: string };

export function decideCustomizationRead(input: ReaderPolicyInput): ReaderDecision {
  const deny = (reason: string) => ({ allowed: false, reason });
  const target = scopeSchema.parse(input.target);
  const selected = resolveScopeChain(input.scopes, target.id).at(-1)!;
  if (JSON.stringify(selected) !== JSON.stringify(target)) return deny("scope_mismatch");
  if (input.withdrawn || input.toolEnabled === false || input.moduleEnabled === false || input.policies.some((policy) => !policy.enabled)) return deny("unavailable");
  const audience = input.policies.reduce((value, policy) => stricterAudience(value, policy.audience), input.audience ?? "public");
  if (input.entitled === false) return deny("entitlement_required");
  if (audience === "public") return { allowed: true, reason: "public" };
  const actor = input.actor;
  if (!actor?.accountActive) return deny("active_account_required");
  if (actor.source !== "database" && !input.allowDemoActor) return deny("verified_relationship_required");
  // System private content has no tenant membership scope; management preview is separate.
  if (target.kind === "system") return deny("tenant_scope_required");
  const membership = actor.memberships.find((membership) => {
    if (membership.unionId !== target.unionId) return false;
    if ((target.kind === "local" || target.kind === "unit") && membership.localId !== target.localId) return false;
    if (target.kind === "unit" && membership.bargainingUnitId !== target.bargainingUnitId) return false;
    const local = input.locals.find((local) => local.unionId === membership.unionId && local.localId === membership.localId);
    if (!local?.active) return false;
    if (target.kind === "division" && local.divisionId !== target.divisionId) return false;
    return audience !== "local_officer" || actor.assignments.some((assignment) => assignment.unionId === membership.unionId && assignment.localId === membership.localId);
  });
  return membership ? { allowed: true, reason: audience } : deny("scoped_relationship_required");
}
