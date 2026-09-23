import { z } from "zod";
import { bargainingUnitIdSchema, isoDateTimeSchema } from "./tenant";

export const grievanceStatusSchema = z.enum([
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "withdrawn",
]);

export const grievanceWorkflowStageSchema = z.enum(["intake", "formal"]);

export const grievanceTypeSchema = z.enum(["individual", "group", "policy"]);

export const grievanceEventTypeSchema = z.enum([
  "step_filed",
  "response_received",
  "meeting_scheduled",
  "deadline",
  "escalation",
  "resolution",
]);

export const grievanceIntakeSchema = z
  .object({
    who: z.string().max(2000).optional(),
    what: z.string().max(10_000).optional(),
    when: z.string().max(2000).optional(),
    where: z.string().max(2000).optional(),
    why: z.string().max(10_000).optional(),
    how: z.string().max(10_000).optional(),
    remedy: z.string().max(10_000).optional(),
  })
  .strict();

export const grievanceLinkedSnippetSchema = z
  .object({
    snippetId: z.string().min(1).max(200),
    clauseRef: z.string().max(200),
    title: z.string().max(500),
    bodySnapshot: z.string().max(50_000),
  })
  .strict();

/** POST /api/grievances — tenant ids come from the session, never the body. */
export const createGrievanceSchema = z
  .object({
    memberPseudonym: z.string().max(200).optional(),
    memberUserId: z.string().min(1).optional(),
    privacyMode: z.enum(["standard", "restricted"]).optional(),
    category: z.string().min(1).max(200),
    filedAt: isoDateTimeSchema,
    assignedStewardId: z.string().min(1).optional(),
    bargainingUnitId: bargainingUnitIdSchema,
    workflowStage: grievanceWorkflowStageSchema.optional(),
    fileNumber: z.string().min(1).max(64).optional(),
    grievanceType: grievanceTypeSchema.optional(),
    memberNames: z.array(z.string().min(1).max(200)).max(50).optional(),
    summary: z.string().max(10_000).optional(),
    intake: grievanceIntakeSchema.optional(),
    linkedSnippets: z.array(grievanceLinkedSnippetSchema).max(50).optional(),
    localLabel: z.string().max(200).optional(),
    unitLabel: z.string().max(200).optional(),
  })
  .strict();

/** PATCH /api/grievances/[id] — allowlist only; rejects tenant-identity keys. */
export const updateGrievanceSchema = z
  .object({
    status: grievanceStatusSchema,
    currentStep: z.number().int().min(1).max(10),
    memberPseudonym: z.string().max(200),
    privacyMode: z.enum(["standard", "restricted"]),
    category: z.string().min(1).max(200),
    assignedStewardId: z.string().min(1),
    bargainingUnitId: z.string().min(1).nullable(),
    resolvedAt: isoDateTimeSchema.nullable(),
    workflowStage: grievanceWorkflowStageSchema,
    fileNumber: z.string().min(1).max(64),
    grievanceType: grievanceTypeSchema.nullable(),
    memberNames: z.array(z.string().min(1).max(200)).max(50).nullable(),
    summary: z.string().max(10_000).nullable(),
    intake: grievanceIntakeSchema.nullable(),
    linkedSnippets: z.array(grievanceLinkedSnippetSchema).max(50).nullable(),
    localLabel: z.string().max(200).nullable(),
    unitLabel: z.string().max(200).nullable(),
  })
  .partial()
  .strict();

export const createNoteSchema = z
  .object({
    body: z.string().min(1).max(10_000),
  })
  .strict();

export const createEventSchema = z
  .object({
    type: grievanceEventTypeSchema,
    stepNumber: z.number().int().min(1).max(10).optional(),
    dueAt: isoDateTimeSchema.optional(),
    completedAt: isoDateTimeSchema.optional(),
    note: z.string().max(2000).optional(),
  })
  .strict();

export const grievanceOutcomeTypeSchema = z.enum([
  "upheld",
  "denied",
  "settled",
  "withdrawn",
]);

/**
 * POST /api/grievances/[id]/outcome — tenant ids / recordedById come from
 * the session and route params, never the body.
 */
export const createGrievanceOutcomeSchema = z
  .object({
    outcomeType: grievanceOutcomeTypeSchema,
    remedy: z.string().max(10_000).optional(),
    settlementTerms: z.string().max(10_000).optional(),
    arbitratorName: z.string().max(200).optional(),
    mediatorName: z.string().max(200).optional(),
    hearingDate: isoDateTimeSchema.optional(),
    decidedAt: isoDateTimeSchema,
    sentToArbitration: z.boolean().optional(),
    sentToArbitrationAt: isoDateTimeSchema.optional(),
  })
  .strict();
