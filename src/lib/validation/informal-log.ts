import { z } from "zod";
import { bargainingUnitIdSchema, isoDateTimeSchema } from "./tenant";

export const informalLogChannelSchema = z.enum([
  "email",
  "phone",
  "in_person",
  "letter",
  "other",
]);

/** POST /api/informal-log — tenant ids come from the session, never the body. */
export const createInformalLogSchema = z
  .object({
    memberPseudonym: z.string().max(200).optional(),
    topic: z.string().min(1).max(500),
    channel: informalLogChannelSchema,
    summary: z.string().min(1).max(5000),
    occurredAt: isoDateTimeSchema,
    bargainingUnitId: bargainingUnitIdSchema,
  })
  .strict();

/** PATCH /api/informal-log/[id] — allowlist only. */
export const updateInformalLogSchema = z
  .object({
    memberPseudonym: z.string().max(200).nullable(),
    topic: z.string().min(1).max(500),
    channel: informalLogChannelSchema,
    summary: z.string().min(1).max(5000),
    occurredAt: isoDateTimeSchema,
    bargainingUnitId: bargainingUnitIdSchema.nullable(),
  })
  .partial()
  .strict();
