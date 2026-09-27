import { z } from "zod";

const boundedText = (max: number) => z.string().trim().min(1).max(max);

const fields = {
  kind: z.enum(["privacy", "security", "availability", "other"]),
  occurredAt: z.string().datetime({ offset: true }).nullable().transform((value) => value ? new Date(value) : null),
  discoveredAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  affectedSystem: boundedText(160),
  dataCategories: z.array(z.string().trim().min(1).max(120)).min(1).max(20)
    .refine((items) => new Set(items).size === items.length),
  affectedPartyCategories: z.array(z.enum([
    "members", "officers", "staff", "customer_administrators", "public_visitors", "unknown", "other",
  ])).min(1).max(7).refine((items) => new Set(items).size === items.length),
  affectedIndividualEstimate: z.number().int().nonnegative().max(2_147_483_647).nullable(),
  lastReviewedAt: z.string().date().nullable().transform((value) => value ? new Date(`${value}T00:00:00.000Z`) : null),
  severity: z.enum(["low", "moderate", "high", "critical"]),
  scopeSummary: boundedText(5000),
  containmentSummary: boundedText(5000),
  riskAssessment: boundedText(5000),
  notificationDecision: z.enum(["not_assessed", "not_required", "required", "completed"]),
  notificationDecisionAt: z.string().datetime({ offset: true }).nullable().transform((value) => value ? new Date(value) : null),
  notificationRationale: boundedText(5000),
  remediationSummary: boundedText(5000),
  lessonsLearned: boundedText(5000),
  status: z.enum(["open", "contained", "closed"]),
};

export const platformIncidentCreateSchema = z.object({
  ...fields,
  status: z.literal("open"),
}).strict().superRefine(validateIncidentTimeline);

export const platformIncidentUpdateSchema = z.object(fields).strict().superRefine(validateIncidentTimeline);

function validateIncidentTimeline(
  value: z.infer<z.ZodObject<typeof fields>>,
  ctx: z.RefinementCtx,
) {
  if (value.occurredAt && value.occurredAt > value.discoveredAt) {
    ctx.addIssue({ code: "custom", path: ["occurredAt"], message: "Occurrence cannot follow discovery." });
  }
  const needsDecisionDate = value.notificationDecision !== "not_assessed";
  if (needsDecisionDate && !value.notificationDecisionAt) {
    ctx.addIssue({ code: "custom", path: ["notificationDecisionAt"], message: "Record when the decision was made." });
  }
  if (!needsDecisionDate && value.notificationDecisionAt) {
    ctx.addIssue({ code: "custom", path: ["notificationDecisionAt"], message: "An unassessed decision has no decision date." });
  }
  if (value.notificationDecisionAt && value.notificationDecisionAt < value.discoveredAt) {
    ctx.addIssue({ code: "custom", path: ["notificationDecisionAt"], message: "Decision cannot precede discovery." });
  }
}

export const incidentStepUpSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  action: z.enum(["view", "create", "update", "export"]),
  resourceId: z.string().uuid().optional(),
}).strict().superRefine((value, ctx) => {
  const requiresResource = value.action === "update" || value.action === "export";
  if (requiresResource && !value.resourceId) {
    ctx.addIssue({ code: "custom", path: ["resourceId"], message: "This action requires an incident id." });
  }
  if (!requiresResource && value.resourceId) {
    ctx.addIssue({ code: "custom", path: ["resourceId"], message: "This action cannot target an incident id." });
  }
});

export const incidentIdSchema = z.string().uuid();
