import type { UnionLifecycleRow } from "@/lib/site-admin/union-lifecycle-shared";

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/** Operator-facing reason Delete stays unavailable for a non-empty archived union. */
export function unionDeleteBlockedReason(
  row: Pick<
    UnionLifecycleRow,
    | "archivedAt"
    | "empty"
    | "localCount"
    | "userCount"
    | "inviteCount"
    | "membershipCount"
    | "caseworkCount"
    | "isDemo"
  >,
  t: Translate,
): string | null {
  if (!row.archivedAt || row.empty) return null;
  const parts: string[] = [];
  if (row.localCount > 0) {
    parts.push(t("unionDeleteBlockedLocals", { count: row.localCount }));
  }
  if (row.userCount > 0) {
    parts.push(t("unionDeleteBlockedUsers", { count: row.userCount }));
  }
  if (row.inviteCount > 0) {
    parts.push(t("unionDeleteBlockedInvites", { count: row.inviteCount }));
  }
  if (row.membershipCount > 0) {
    parts.push(
      t("unionDeleteBlockedMemberships", { count: row.membershipCount }),
    );
  }
  if (row.caseworkCount > 0) {
    parts.push(t("unionDeleteBlockedCasework", { count: row.caseworkCount }));
  }
  if (parts.length === 0) {
    return t("unionDeleteBlockedGeneric");
  }
  const summary = t("unionDeleteBlockedSummary", {
    parts: parts.join(t("unionDeleteBlockedJoin")),
  });
  if (row.isDemo) {
    return `${summary} ${t("unionDeleteBlockedDemoHint")}`;
  }
  return `${summary} ${t("unionDeleteBlockedLocalsHint")}`;
}
