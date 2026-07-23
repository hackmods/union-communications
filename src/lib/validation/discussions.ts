import { z } from "zod";
import { bargainingUnitIdSchema } from "./tenant";

export const createDiscussionThreadSchema = z
  .object({
    title: z.string().min(1).max(300),
    body: z.string().min(1).max(20_000),
    bargainingUnitId: bargainingUnitIdSchema,
    grievanceId: z.string().min(1).max(200).optional(),
    bumpingCaseId: z.string().min(1).max(200).optional(),
  })
  .strict()
  .refine(
    (v) => !(v.grievanceId && v.bumpingCaseId),
    "Thread cannot link to both a grievance and a bumping case",
  );

export const createDiscussionPostSchema = z
  .object({
    body: z.string().min(1).max(20_000),
  })
  .strict();
