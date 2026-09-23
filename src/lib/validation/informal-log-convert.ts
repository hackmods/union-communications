import { z } from "zod";
import { grievanceTypeSchema, grievanceIntakeSchema, grievanceLinkedSnippetSchema } from "@/lib/validation/grievance";

/** Optional enrichment when converting Informal Log → intake grievance. */
export const convertInformalLogSchema = z
  .object({
    grievanceType: grievanceTypeSchema.optional(),
    summary: z.string().max(10_000).optional(),
    intake: grievanceIntakeSchema.optional(),
    linkedSnippets: z.array(grievanceLinkedSnippetSchema).max(50).optional(),
    memberNames: z.array(z.string().min(1).max(200)).max(50).optional(),
  })
  .strict();
