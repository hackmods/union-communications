import { z } from "zod";
import { ACCESS_REQUEST_KINDS, ACCESS_REQUEST_OFFERINGS } from "@/types/access-request";
export const accessRequestSchema = z.object({
  submissionKey: z.string().trim().min(16).max(120),
  kind: z.enum(ACCESS_REQUEST_KINDS), name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254), unionName: z.string().trim().min(2).max(160),
  localName: z.string().trim().min(1).max(160), role: z.string().trim().max(120).optional(),
  offerings: z.array(z.enum(ACCESS_REQUEST_OFFERINGS)).min(1).max(2), message: z.string().trim().max(2000).optional(),
  locale: z.enum(["en", "fr"]), consentAccepted: z.literal(true), website: z.string().max(120).optional(),
}).strict();
