import { z } from "zod";
import { bargainingUnitIdSchema } from "./tenant";

const cadenceSchema = z.enum(["daily", "weekdays", "weekly"]);

export const createCheckinScheduleSchema = z
  .object({
    question: z.string().min(1).max(2000),
    cadence: cadenceSchema,
    weekday: z.number().int().min(0).max(6).optional(),
    bargainingUnitId: bargainingUnitIdSchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.cadence === "weekly" && v.weekday === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "weekday is required when cadence is weekly",
        path: ["weekday"],
      });
    }
  });

export const updateCheckinScheduleSchema = z
  .object({
    question: z.string().min(1).max(2000).optional(),
    cadence: cadenceSchema.optional(),
    weekday: z.number().int().min(0).max(6).nullable().optional(),
    active: z.boolean().optional(),
    bargainingUnitId: bargainingUnitIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.cadence === "weekly" && v.weekday === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "weekday is required when cadence is weekly",
        path: ["weekday"],
      });
    }
  });

export const createCheckinAnswerSchema = z
  .object({
    body: z.string().min(1).max(20_000),
    periodKey: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();
