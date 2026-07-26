import { z } from "zod";

const moneySchema = z.number().finite().positive().max(1_000_000_000);

const dateSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be a valid date");

const purchaseCategorySchema = z.enum([
  "supplies",
  "meeting",
  "printing",
  "solidarity",
  "postage",
  "other",
]);

const lineItemSchema = z
  .object({
    date: dateSchema,
    category: purchaseCategorySchema.or(z.string().min(1).max(120)),
    amount: moneySchema,
    description: z.string().min(1).max(500),
  })
  .strict();

export const createExpenseSubmissionSchema = z
  .object({
    title: z.string().min(1).max(200),
    purpose: z.string().min(1).max(500),
    lineItems: z.array(lineItemSchema).min(1).max(200),
  })
  .strict();

export const updateExpenseSubmissionSchema = z
  .object({
    title: z.string().min(1).max(200),
    purpose: z.string().min(1).max(500),
    lineItems: z.array(lineItemSchema).min(1).max(200),
    status: z.enum(["draft", "submitted"]),
  })
  .partial()
  .strict();

export const denyExpenseSubmissionSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();
