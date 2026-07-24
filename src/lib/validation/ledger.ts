import { z } from "zod";

export const ledgerEntryTypeSchema = z.enum(["income", "expense"]);

const amountSchema = z
  .number()
  .finite()
  .positive()
  .max(1_000_000_000);

/** Calendar date or ISO datetime string. */
const ledgerDateSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be a valid date");

/** POST /api/ledger — tenant ids come from the session, never the body. */
export const createLedgerEntrySchema = z
  .object({
    date: ledgerDateSchema,
    description: z.string().min(1).max(1000),
    amount: amountSchema,
    type: ledgerEntryTypeSchema,
    category: z.string().min(1).max(120),
  })
  .strict();

/** PATCH /api/ledger/[id] — allowlist only; rejects tenant-identity keys. */
export const updateLedgerEntrySchema = z
  .object({
    date: ledgerDateSchema,
    description: z.string().min(1).max(1000),
    amount: amountSchema,
    type: ledgerEntryTypeSchema,
    category: z.string().min(1).max(120),
  })
  .partial()
  .strict();
