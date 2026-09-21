/** A value that cannot match a real local and therefore represents deny-all. */
export const NO_LOCAL_CONTEXT_FILTER = "__no_local_context__";

/**
 * Build a local filter without interpreting a missing context as union-wide.
 * Only an explicit cross-local capability may omit the filter.
 */
export function localScopeFilter(
  localId: string | null | undefined,
  mayCrossLocal: boolean,
): string | undefined {
  return localId ?? (mayCrossLocal ? undefined : NO_LOCAL_CONTEXT_FILTER);
}
