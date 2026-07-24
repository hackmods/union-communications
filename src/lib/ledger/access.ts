import type { LedgerEntry } from "@/types/ledger";
import type { UserRole } from "@/types/tenant";

/**
 * Treasurer / president elevated gate for the discretionary fund ledger.
 * There is no dedicated `treasurer` role — `local_exec` covers treasurer & exec board.
 */
const LEDGER_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

const CROSS_LOCAL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

export function canAccessLedgerModule(roles: UserRole[]): boolean {
  return roles.some((r) => LEDGER_ROLES.includes(r));
}

export function canCrossLocalLedger(roles: UserRole[]): boolean {
  return roles.some((r) => CROSS_LOCAL_ROLES.includes(r));
}

export function canViewLedgerEntry(
  entry: LedgerEntry,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessLedgerModule(roles)) return false;
  if (!unionId || entry.unionId !== unionId) return false;
  if (localId && entry.localId !== localId) {
    if (!canCrossLocalLedger(roles)) return false;
  }
  return true;
}

export function canMutateLedger(roles: UserRole[]): boolean {
  return canAccessLedgerModule(roles);
}
