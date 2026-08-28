export const RULES_OF_ORDER_ACTION_IDS = [
  "mainMotion",
  "amendMotion",
  "callQuestion",
  "pointOfPrivilege",
  "pointOfOrder",
  "pointOfInformation",
] as const;

export type RulesOfOrderActionId = (typeof RULES_OF_ORDER_ACTION_IDS)[number];

export const RULES_OF_ORDER_CATEGORIES = [
  {
    id: "motions",
    actionIds: ["mainMotion", "amendMotion", "callQuestion"] as const,
  },
  {
    id: "points",
    actionIds: [
      "pointOfPrivilege",
      "pointOfOrder",
      "pointOfInformation",
    ] as const,
  },
] as const;

export type RulesOfOrderCategoryId =
  (typeof RULES_OF_ORDER_CATEGORIES)[number]["id"];
