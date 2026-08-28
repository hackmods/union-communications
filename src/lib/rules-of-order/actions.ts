export const RULES_OF_ORDER_ACTION_IDS = [
  "mainMotion",
  "amendMotion",
  "callQuestion",
  "tableMotion",
  "referCommittee",
  "limitDebate",
  "divideQuestion",
  "reconsider",
  "withdrawMotion",
  "pointOfPrivilege",
  "pointOfOrder",
  "pointOfInformation",
  "adjourn",
  "recess",
] as const;

export type RulesOfOrderActionId = (typeof RULES_OF_ORDER_ACTION_IDS)[number];

export const RULES_OF_ORDER_CATEGORIES = [
  {
    id: "motions",
    actionIds: [
      "mainMotion",
      "amendMotion",
      "callQuestion",
      "tableMotion",
      "referCommittee",
      "limitDebate",
      "divideQuestion",
      "reconsider",
      "withdrawMotion",
    ] as const,
  },
  {
    id: "points",
    actionIds: [
      "pointOfPrivilege",
      "pointOfOrder",
      "pointOfInformation",
    ] as const,
  },
  {
    id: "meeting",
    actionIds: ["adjourn", "recess"] as const,
  },
] as const;

export type RulesOfOrderCategoryId =
  (typeof RULES_OF_ORDER_CATEGORIES)[number]["id"];

/** Detail keys rendered on the cheat-sheet card (mirrors `rulesOfOrder.actions.*` in i18n). */
export const RULES_OF_ORDER_DETAIL_FIELDS = [
  "whatToSay",
  "hint",
  "canInterrupt",
  "needsSeconder",
  "isDebatable",
  "voteRequired",
  "chairNote",
] as const;

export type RulesOfOrderDetailField =
  (typeof RULES_OF_ORDER_DETAIL_FIELDS)[number];

export function getCategoryForAction(
  id: RulesOfOrderActionId,
): RulesOfOrderCategoryId {
  return (
    RULES_OF_ORDER_CATEGORIES.find((category) =>
      category.actionIds.some((actionId) => actionId === id),
    )?.id ?? "motions"
  );
}
