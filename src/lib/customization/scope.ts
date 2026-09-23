import { scopeSchema } from "@/lib/customization/schemas";
import type { CustomizationScope } from "@/lib/customization/types";

/** Records must come from an authoritative tenant adapter, never request-body IDs. */
export function resolveScopeChain(records: readonly unknown[], targetScopeId?: string): CustomizationScope[] {
  const scopes = records.map((record) => scopeSchema.parse(record));
  const byId = new Map(scopes.map((scope) => [scope.id, scope]));
  if (byId.size !== scopes.length) throw new Error("Duplicate scope ID");
  const identities = scopes.map((scope) => JSON.stringify([
    scope.kind,
    "unionId" in scope ? scope.unionId : null,
    scope.kind === "division" ? scope.divisionId : scope.kind === "local" ? scope.localId : scope.kind === "unit" ? scope.bargainingUnitId : null,
  ]));
  if (new Set(identities).size !== identities.length) throw new Error("Duplicate tenant scope identity");
  const systems = scopes.filter((scope) => scope.kind === "system");
  if (systems.length !== 1) throw new Error("Exactly one system scope is required");
  const chain: CustomizationScope[] = [];
  let current = byId.get(targetScopeId ?? systems[0].id);
  if (!current) throw new Error("Unknown target scope");
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id) || chain.length >= 5) throw new Error("Invalid scope depth or cycle");
    if (current.archived) throw new Error("Archived scope");
    seen.add(current.id);
    chain.unshift(current);
    if (current.kind === "system") break;
    current = byId.get(current.parentScopeId);
    if (!current) throw new Error("Missing parent scope");
  }
  for (let i = 1; i < chain.length; i++) {
    const parent = chain[i - 1];
    const child = chain[i];
    if (child.kind === "system") throw new Error("Nested system scope");
    if (parent.kind !== "system" && child.unionId !== parent.unionId) throw new Error("Cross-union scope");
    const valid = child.kind === "union" ? parent.kind === "system"
      : child.kind === "division" ? parent.kind === "union"
      : child.kind === "local" ? (parent.kind === "union" && !child.divisionId) || (parent.kind === "division" && child.divisionId === parent.divisionId)
      : parent.kind === "local" && child.localId === parent.localId && child.divisionId === parent.divisionId;
    if (!valid) throw new Error("Scope parent does not match tenant hierarchy");
  }
  return chain;
}
