/** Fallback local number when none entered — B7P wink (Local 777), not a real OPSEU local. */
export const DEFAULT_LOCAL_NUMBER = "777";

export function resolveLocalNumber(localNumber?: string | null): string {
  const trimmed = localNumber?.trim();
  return trimmed ? trimmed : DEFAULT_LOCAL_NUMBER;
}

/**
 * Canonical local display label for canvas chrome + tool previews:
 * `Local {n}` or `Local {n} - {subText}`. Single source so the poster family
 * never drifts on separators (2026-09-13).
 */
export function localLabel(
  localNumber?: string | null,
  subText?: string | null,
): string {
  const num = resolveLocalNumber(localNumber);
  const sub = subText?.trim();
  return sub ? `Local ${num} - ${sub}` : `Local ${num}`;
}
