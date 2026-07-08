/** Fallback local number when none entered - easter egg for Local 243 */
export const DEFAULT_LOCAL_NUMBER = "243";

export function resolveLocalNumber(localNumber?: string | null): string {
  const trimmed = localNumber?.trim();
  return trimmed ? trimmed : DEFAULT_LOCAL_NUMBER;
}
