import { z } from "zod";

const pollQuestionSchema = z
  .object({
    id: z.string().min(1).max(120),
    text: z.string().min(1).max(1000),
    type: z.enum(["single_choice", "free_text"]),
    options: z.array(z.string().min(1).max(200)).max(20).optional(),
  })
  .strict()
  .superRefine((q, ctx) => {
    if (q.type === "single_choice") {
      if (!q.options || q.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "single_choice requires at least 2 options",
          path: ["options"],
        });
      }
    }
  });

/** POST /api/polls — tenant ids from session. */
export const createPollSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1).max(200),
    intro: z.string().max(2000).optional(),
    questions: z.array(pollQuestionSchema).min(1).max(40),
    consentRequired: z.boolean().optional(),
    status: z.enum(["open", "closed"]).optional(),
  })
  .strict();

/** PATCH /api/polls/[id] */
export const updatePollSchema = z
  .object({
    title: z.string().min(1).max(200),
    intro: z.string().max(2000).nullable(),
    questions: z.array(pollQuestionSchema).min(1).max(40),
    status: z.enum(["open", "closed"]),
    consentRequired: z.boolean(),
  })
  .partial()
  .strict();

/** POST /api/polls/[slug]/responses — public submit. */
export const submitPollResponseSchema = z
  .object({
    answers: z.record(z.string(), z.string().max(4000)),
    consentAccepted: z.boolean(),
  })
  .strict();
