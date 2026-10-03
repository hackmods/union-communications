import { z } from "zod";
import {
  ACCESS_REQUEST_KINDS,
  ACCESS_REQUEST_OFFERINGS,
  type NewAccessRequest,
} from "@/types/access-request";

/** FormData JSON serializes missing optional fields as `null`. */
const optionalLine = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

export const accessRequestSchema = z
  .object({
    submissionKey: z.string().trim().min(16).max(120),
    kind: z.enum(ACCESS_REQUEST_KINDS),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    unionName: z.string().trim().min(2).max(160),
    localName: z.string().trim().min(1).max(160),
    role: optionalLine,
    offerings: z.array(z.enum(ACCESS_REQUEST_OFFERINGS)).min(1).max(2),
    message: optionalLine,
    locale: z.enum(["en", "fr"]),
    consentAccepted: z.literal(true),
    website: optionalLine,
  })
  .strict();

export type AccessRequestInput = z.infer<typeof accessRequestSchema>;

export function toNewAccessRequest(data: AccessRequestInput): NewAccessRequest {
  return {
    submissionKey: data.submissionKey,
    kind: data.kind,
    name: data.name,
    email: data.email,
    unionName: data.unionName,
    localName: data.localName,
    offerings: data.offerings,
    locale: data.locale,
    ...(data.role ? { role: data.role } : {}),
    ...(data.message ? { message: data.message } : {}),
  };
}
