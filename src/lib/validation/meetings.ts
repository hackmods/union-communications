import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/, "time must be HH:mm 24h");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const upsertMeetingScheduleSchema = z
  .object({
    recurrence: z.enum(["monthly", "custom"]),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    weekday: z.number().int().min(0).max(6).optional(),
    nthWeekOfMonth: z
      .union([z.literal(-1), z.number().int().min(1).max(4)])
      .optional(),
    customDates: z.array(isoDateSchema).max(24).optional(),
    time: timeSchema,
    durationMinutes: z.number().int().min(15).max(600).optional(),
    location: z.string().min(1).max(300),
    publicBlurb: z.string().max(1000).optional(),
    timezone: z.string().min(1).max(100),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.recurrence === "monthly") {
      const hasDayOfMonth = val.dayOfMonth != null;
      const hasWeekdayRule = val.weekday != null && val.nthWeekOfMonth != null;
      if (!hasDayOfMonth && !hasWeekdayRule) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "monthly recurrence requires dayOfMonth, or weekday + nthWeekOfMonth",
          path: ["dayOfMonth"],
        });
      }
      if (hasDayOfMonth && hasWeekdayRule) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "provide dayOfMonth OR weekday + nthWeekOfMonth, not both",
          path: ["dayOfMonth"],
        });
      }
    }
    if (val.recurrence === "custom" && (!val.customDates || val.customDates.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "custom recurrence requires at least one date",
        path: ["customDates"],
      });
    }
  });

export type UpsertMeetingScheduleBody = z.infer<
  typeof upsertMeetingScheduleSchema
>;
