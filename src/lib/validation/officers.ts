import { z } from "zod";

/** Calendar date or ISO datetime string. */
const officerDateSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be a valid date");

const committeesSchema = z.array(z.string().min(1).max(120)).max(20);

/** POST /api/officers — tenant ids come from the session, never the body. */
export const createOfficerRosterSchema = z
  .object({
    name: z.string().min(1).max(200),
    role: z.string().min(1).max(120),
    termStart: officerDateSchema,
    termEnd: officerDateSchema.optional(),
    email: z.string().email().max(200).optional(),
    phone: z.string().min(1).max(40).optional(),
    committees: committeesSchema.optional(),
  })
  .strict();

/** PATCH /api/officers/[id] — allowlist only; rejects tenant-identity keys. */
export const updateOfficerRosterSchema = z
  .object({
    name: z.string().min(1).max(200),
    role: z.string().min(1).max(120),
    termStart: officerDateSchema,
    termEnd: officerDateSchema.nullable(),
    email: z.string().email().max(200).nullable(),
    phone: z.string().min(1).max(40).nullable(),
    committees: committeesSchema.nullable(),
  })
  .partial()
  .strict();
