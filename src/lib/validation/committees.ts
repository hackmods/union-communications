import { z } from "zod";

const officerIdSchema = z.string().min(1).max(120);
const memberUserIdSchema = z.string().min(1).max(200);

/** POST /api/committees — tenant ids come from the session, never the body. */
export const createCommitteeSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    memberOfficerIds: z.array(officerIdSchema).max(200).optional(),
    memberUserIds: z.array(memberUserIdSchema).max(200).optional(),
  })
  .strict();

/** PATCH /api/committees/[id] — allowlist only; rejects tenant-identity keys. */
export const updateCommitteeSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable(),
    memberOfficerIds: z.array(officerIdSchema).max(200),
    memberUserIds: z.array(memberUserIdSchema).max(200),
  })
  .partial()
  .strict();
