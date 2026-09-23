import { resolveScopeChain } from "@/lib/customization/scope";
import type { CustomizationScope } from "@/lib/customization/types";

/** Only descriptors returned by the trusted tenant adapter are accepted here. */
export function selectCustomizationContext(scopes: readonly unknown[], explicitScopeId?: string): CustomizationScope {
  const chain = resolveScopeChain(scopes, explicitScopeId);
  return chain[chain.length - 1];
}

/** Constructed only after a management decision permits the explicit target. */
export function customizationRlsTarget(scope: CustomizationScope, userId?: string, mfaVerified = false) {
  return {
    userId, mfaVerified, crossLocal: false,
    unionId: scope.kind === "system" ? undefined : scope.unionId,
    localId: scope.kind === "local" || scope.kind === "unit" ? scope.localId : undefined,
  };
}
