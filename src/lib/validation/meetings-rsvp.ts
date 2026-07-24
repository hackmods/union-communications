import { z } from "zod";

const attendingSchema = z.enum(["yes", "no", "maybe"]);
const joinModeSchema = z.enum(["on_site", "remote"]);

function requireJoinModeWhenAttending(
  val: { attending: "yes" | "no" | "maybe"; joinMode?: "on_site" | "remote" },
  ctx: z.RefinementCtx,
) {
  if (
    (val.attending === "yes" || val.attending === "maybe") &&
    val.joinMode == null
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "joinMode is required when attending is yes or maybe",
      path: ["joinMode"],
    });
  }
  if (val.attending === "no" && val.joinMode != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "joinMode must be omitted when attending is no",
      path: ["joinMode"],
    });
  }
}

/** POST /api/meetings/events — tenant ids from session. */
export const createUnionMeetingSchema = z
  .object({
    title: z.string().min(1).max(200),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    location: z.string().min(1).max(300),
    publicBlurb: z.string().max(1000).optional(),
    quorumNeeded: z.number().int().min(1).max(5000).optional(),
    hybrid: z.boolean().optional(),
    bargainingUnitId: z.string().min(1).max(120).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (new Date(val.endsAt).getTime() <= new Date(val.startsAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endsAt must be after startsAt",
        path: ["endsAt"],
      });
    }
  });

/** PATCH /api/meetings/events/[id] */
export const updateUnionMeetingSchema = z
  .object({
    title: z.string().min(1).max(200),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    location: z.string().min(1).max(300),
    publicBlurb: z.string().max(1000).nullable(),
    quorumNeeded: z.number().int().min(1).max(5000).nullable(),
    hybrid: z.boolean(),
    bargainingUnitId: z.string().min(1).max(120).nullable(),
  })
  .partial()
  .strict();

/** POST /api/meetings/events/[id]/tokens */
export const createRsvpTokenSchema = z
  .object({
    expiresAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

const rsvpFieldsObject = z
  .object({
    attending: attendingSchema,
    joinMode: joinModeSchema.optional(),
    displayName: z.string().min(1).max(120),
    email: z.union([z.string().email().max(200), z.literal("")]).optional(),
    phone: z.string().max(40).optional(),
    guestsOnSite: z.number().int().min(0).max(20).optional(),
    dietaryNote: z.string().max(500).optional(),
    accessibilityNote: z.string().max(500).optional(),
    roleOrOffice: z.string().max(120).optional(),
    consentAccepted: z.boolean().optional(),
  })
  .strict();

/** POST /api/rsvp/[token] — public submit (+ optional confirmation email). */
export const submitPublicRsvpSchema = rsvpFieldsObject
  .extend({
    /** Opt-in one-shot confirmation to `email` when SMTP is configured (R3). */
    consentEmailConfirm: z.boolean().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    requireJoinModeWhenAttending(val, ctx);
    if (val.consentEmailConfirm === true) {
      const email = typeof val.email === "string" ? val.email.trim() : "";
      if (!email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "email is required when consentEmailConfirm is true",
          path: ["email"],
        });
      }
    }
  });

/** POST /api/meetings/events/[id]/responses — officer walk-in. */
export const submitWalkInRsvpSchema = rsvpFieldsObject.superRefine(
  requireJoinModeWhenAttending,
);

export type CreateUnionMeetingBody = z.infer<typeof createUnionMeetingSchema>;
export type UpdateUnionMeetingBody = z.infer<typeof updateUnionMeetingSchema>;
export type SubmitPublicRsvpBody = z.infer<typeof submitPublicRsvpSchema>;
