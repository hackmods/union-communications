import { z } from "zod";
import { getCategoryForAction, RULES_OF_ORDER_ACTION_IDS } from "@/lib/rules-of-order/actions";

/** Code-owned capabilities. Data cannot register a tool or executable schema. */
export const toolConfigurationSchema = z.discriminatedUnion("toolId", [
  z.object({
    toolId: z.literal("rules-of-order"),
    initialCategory: z.enum(["all", "motions", "points", "meeting"]),
    initialAction: z.enum(RULES_OF_ORDER_ACTION_IDS),
  }).strict(),
]).superRefine((configuration, context) => {
  if (configuration.initialCategory !== "all" && getCategoryForAction(configuration.initialAction) !== configuration.initialCategory) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["initialAction"], message: "Initial action must be visible in its category" });
  }
});

/** No consumer uses these defaults until the C08 integration is shipped. */
export const DEFAULT_RULES_OF_ORDER_CONFIGURATION = toolConfigurationSchema.parse({
  toolId: "rules-of-order",
  initialCategory: "all",
  initialAction: "mainMotion",
});
