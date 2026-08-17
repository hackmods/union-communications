import { z } from "zod";
import {
  SITE_FEEDBACK_CATEGORIES,
  SITE_FEEDBACK_STATUSES,
} from "@/types/platform-feedback";

const pagePathSchema = z.union([
  z.literal(""),
  z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^\/[A-Za-z0-9/_\-.?=&#%]*$/,
      "Must be a relative path starting with /",
    ),
]);

const optionalEmailSchema = z.union([
  z.literal(""),
  z.string().trim().email().max(254),
]);

/** POST /api/feedback — identity/status/source are server-stamped. */
export const submitSiteFeedbackSchema = z
  .object({
    category: z.enum(SITE_FEEDBACK_CATEGORIES),
    body: z.string().trim().min(20).max(4000),
    pagePath: pagePathSchema.optional(),
    locale: z.enum(["en", "fr"]).optional(),
    contactEmail: optionalEmailSchema.optional(),
    contactName: z.union([z.literal(""), z.string().trim().max(80)]).optional(),
    consentAccepted: z.literal(true),
    /** Honeypot — must be empty. */
    website: z.string().max(200).optional(),
  })
  .strict();

export type SubmitSiteFeedbackBody = z.infer<typeof submitSiteFeedbackSchema>;

/** PATCH /api/platform-feedback/[id] — platform_admin only. */
export const updateSiteFeedbackSchema = z
  .object({
    status: z.enum(SITE_FEEDBACK_STATUSES).optional(),
    stewardNote: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();
