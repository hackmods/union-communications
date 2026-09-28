/**
 * Client-safe union lifecycle helpers (no DB imports).
 */
export type UnionLifecycleRow = {
  id: string;
  name: string;
  slug: string;
  isDemo: boolean;
  archivedAt: string | null;
  createdAt: string | null;
  membershipPolicy: "multi_local" | "single_local";
  localCount: number;
  activeLocalCount: number;
  userCount: number;
  inviteCount: number;
  membershipCount: number;
  caseworkCount: number;
  empty: boolean;
};

/** Case-insensitive display-name key for duplicate spotting. */
export function unionNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Sort active first, then name, then created (oldest first within a name). */
export function sortUnionsForSiteAdmin(
  rows: readonly UnionLifecycleRow[],
): UnionLifecycleRow[] {
  return [...rows].sort((a, b) => {
    const aArchived = Boolean(a.archivedAt);
    const bArchived = Boolean(b.archivedAt);
    if (aArchived !== bArchived) return aArchived ? 1 : -1;
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    const aCreated = a.createdAt ?? "";
    const bCreated = b.createdAt ?? "";
    return aCreated.localeCompare(bCreated);
  });
}

export function duplicateNameKeys(
  rows: readonly UnionLifecycleRow[],
): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = unionNameKey(row.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [key, n] of counts) {
    if (n > 1) dupes.add(key);
  }
  return dupes;
}
