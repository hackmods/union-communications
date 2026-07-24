import { z } from "zod";

const moneySchema = z.number().finite().min(0).max(1_000_000_000);

const dateSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be a valid date");

export const estimatedCostsSchema = z
  .object({
    travel: moneySchema,
    lodging: moneySchema,
    meals: moneySchema,
    registration: moneySchema,
    other: moneySchema,
  })
  .strict();

export const createTravelAuthorizationSchema = z
  .object({
    purpose: z.string().min(1).max(500),
    eventName: z.string().min(1).max(300),
    eventStartDate: dateSchema,
    eventEndDate: dateSchema,
    estimatedCosts: estimatedCostsSchema,
  })
  .strict();

export const updateTravelAuthorizationSchema = z
  .object({
    purpose: z.string().min(1).max(500),
    eventName: z.string().min(1).max(300),
    eventStartDate: dateSchema,
    eventEndDate: dateSchema,
    estimatedCosts: estimatedCostsSchema,
  })
  .partial()
  .strict();

export const denyTravelSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();

export const issueAdvanceSchema = z
  .object({
    amount: z.number().finite().positive().max(1_000_000_000),
  })
  .strict();

const lineItemSchema = z
  .object({
    date: dateSchema,
    category: z.string().min(1).max(120),
    amount: z.number().finite().positive().max(1_000_000_000),
    description: z.string().min(1).max(500),
  })
  .strict();

export const createExpenseClaimSchema = z
  .object({
    lineItems: z.array(lineItemSchema).min(1).max(200),
  })
  .strict();

export const updateExpenseClaimSchema = z
  .object({
    lineItems: z.array(lineItemSchema).min(1).max(200),
    status: z.enum(["draft", "submitted"]),
  })
  .partial()
  .strict();
