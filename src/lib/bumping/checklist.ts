import type { ChecklistItem } from "@/types/bumping";

/** Default stability committee checklist - not legal advice */
export const DEFAULT_BUMPING_CHECKLIST: ChecklistItem[] = [
  { id: "seniority_verified", labelKey: "seniorityVerified" },
  { id: "duties_compared", labelKey: "dutiesCompared" },
  { id: "qualifications_compared", labelKey: "qualificationsCompared" },
  { id: "ca_article_cited", labelKey: "caArticleCited" },
  { id: "member_notified", labelKey: "memberNotified" },
  { id: "incumbent_notified", labelKey: "incumbentNotified" },
];

export function emptyChecklistState(): Record<string, boolean | null> {
  return Object.fromEntries(
    DEFAULT_BUMPING_CHECKLIST.map((item) => [item.id, null]),
  );
}
