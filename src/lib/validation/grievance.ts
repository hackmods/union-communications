import { z } from "zod";
import { bargainingUnitIdSchema, isoDateTimeSchema } from "./tenant";

export const grievanceStatusSchema = z.enum([
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "withdrawn",
]);

export const grievanceEventTypeSchema = z.enum([
  "step_filed",
  "response_received",
  "meeting_scheduled",
  "deadline",
  "escalation",
  "resolution",
]);

/** POST /api/grievances — tenant ids come from the session, never the body. */
export const createGrievanceSchema = z
  .object({
    memberPseudonym: z.string().max(200).optional(),
    category: z.string().min(1).max(200),
    filedAt: isoDateTimeSchema,
    assignedStewardId: z.string().min(1).optional(),
    bargainingUnitId: bargainingUnitIdSchema,
  })
  .strict();

/** PATCH /api/grievances/[id] — allowlist only; rejects tenant-identity keys. */
export const updateGrievanceSchema = z
  .object({
    status: grievanceStatusSchema,
    currentStep: z.number().int().min(1).max(10),
    memberPseudonym: z.string().max(200),
    category: z.string().min(1).max(200),
    assignedStewardId: z.string().min(1),
    bargainingUnitId: z.string().min(1).nullable(),
    resolvedAt: isoDateTimeSchema.nullable(),
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
    hearingDate: isoDateTimeSchema.optional(),
    decidedAt: isoDateTimeSchema,
  })
  .strict();
