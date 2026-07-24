import { z } from "zod";

export const nominationStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
]);

export const electionCycleStatusSchema = z.enum([
  "open",
  "closed",
  "tallied",
]);

/** POST /api/elections — tenant ids from session. */
export const createElectionCycleSchema = z
  .object({
    title: z.string().min(1).max(300),
    positions: z.array(z.string().min(1).max(120)).min(1).max(50),
    termStart: z.string().min(1).max(40).optional(),
  })
  .strict();

/** PATCH /api/elections/[id] */
export const updateElectionCycleSchema = z
  .object({
    title: z.string().min(1).max(300),
    positions: z.array(z.string().min(1).max(120)).min(1).max(50),
    status: electionCycleStatusSchema,
    termStart: z.string().min(1).max(40).nullable(),
  })
  .partial()
  .strict();

/** POST /api/elections/[id]/nominations */
export const createNominationSchema = z
  .object({
    position: z.string().min(1).max(120),
    nomineeName: z.string().min(1).max(200),
    nominator: z.string().max(200).optional(),
    status: nominationStatusSchema.optional(),
  })
  .strict();

/** PATCH /api/elections/[id]/nominations/[nominationId] */
export const updateNominationSchema = z
  .object({
    position: z.string().min(1).max(120),
    nomineeName: z.string().min(1).max(200),
    status: nominationStatusSchema,
    nominator: z.string().max(200).nullable(),
  })
  .partial()
  .strict();

/** POST /api/elections/[id]/tallies — manual offline tallies only. */
export const recordTalliesSchema = z
  .object({
    tallies: z
      .array(
        z
          .object({
            position: z.string().min(1).max(120),
            nomineeName: z.string().min(1).max(200),
            votes: z.number().int().min(0).max(1_000_000),
          })
          .strict(),
      )
      .max(500),
    markTallied: z.boolean().optional(),
  })
  .strict();

/** POST /api/elections/[id]/promote — create OfficerRosterEntry. */
export const promoteToRosterSchema = z
  .object({
    position: z.string().min(1).max(120),
    nomineeName: z.string().min(1).max(200),
    role: z.string().min(1).max(120).optional(),
    termStart: z.string().min(1).max(40).optional(),
    termEnd: z.string().min(1).max(40).optional(),
  })
  .strict();
