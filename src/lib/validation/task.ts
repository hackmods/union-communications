import { z } from "zod";
import { bargainingUnitIdSchema, isoDateTimeSchema } from "./tenant";

export const taskStatusSchema = z.enum(["open", "done"]);

/** POST /api/tasks — tenant ids come from the session, never the body. */
export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(500),
    assigneeId: z.string().min(1).optional(),
    dueAt: isoDateTimeSchema.optional(),
    bargainingUnitId: bargainingUnitIdSchema,
    relatedGrievanceId: z.string().min(1).optional(),
    relatedBumpingCaseId: z.string().min(1).optional(),
  })
  .strict();

/** PATCH /api/tasks/[id] — allowlist only; rejects tenant-identity keys. */
export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(500),
    assigneeId: z.string().min(1),
    dueAt: isoDateTimeSchema.nullable(),
    status: taskStatusSchema,
    relatedGrievanceId: z.string().min(1).nullable(),
    relatedBumpingCaseId: z.string().min(1).nullable(),
  })
  .partial()
  .strict();
