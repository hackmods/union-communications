import { z } from "zod";

export const bumpingCaseStatusSchema = z.enum([
  "open",
  "in_review",
  "decided",
  "closed",
]);

export const positionDescriptionSchema = z
  .object({
    title: z.string().min(1).max(200),
    duties: z.string().max(20_000),
    qualifications: z.string().max(20_000),
    seniorityNotes: z.string().max(5_000),
    sourceText: z.string().max(200_000).optional(),
    fileName: z.string().max(255).optional(),
  })
  .strict();

const createPositionDescriptionSchema = z
  .object({
    title: z.string().max(200).default(""),
    duties: z.string().max(20_000).default(""),
    qualifications: z.string().max(20_000).default(""),
    seniorityNotes: z.string().max(5_000).default(""),
    sourceText: z.string().max(200_000).optional(),
    fileName: z.string().max(255).optional(),
  })
  .strict();

export const createBumpingCaseSchema = z
  .object({
    memberRef: z.string().min(1).max(200),
    seniorityDate: z.string().min(1).max(40),
    currentPosition: z.string().min(1).max(200),
    targetPosition: z.string().min(1).max(200),
    scenario: z.string().min(1).max(5_000),
    incumbentPosition: createPositionDescriptionSchema.optional(),
    bumpingPosition: createPositionDescriptionSchema.optional(),
  })
  .strict();

export const updateBumpingCaseSchema = z
  .object({
    status: bumpingCaseStatusSchema,
    incumbentPosition: positionDescriptionSchema,
    bumpingPosition: positionDescriptionSchema,
    checklist: z.record(z.string(), z.boolean().nullable()),
  })
  .partial()
  .strict();

export const createDecisionSchema = z
  .object({
    outcome: z.string().min(1).max(2000),
    rationale: z.string().min(1).max(10_000),
    dissentNotes: z.string().max(5_000).optional(),
  })
  .strict();

export const createSessionSchema = z
  .object({
    date: z.string().min(1).max(40),
    attendees: z.array(z.string().min(1).max(200)).max(100),
    agenda: z.string().min(1).max(5_000),
  })
  .strict();

export const createBumpingNoteSchema = z
  .object({
    body: z.string().min(1).max(10_000),
    sessionId: z.string().min(1).optional(),
  })
  .strict();
