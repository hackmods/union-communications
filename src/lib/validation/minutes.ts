import { z } from "zod";
import { isoDateTimeSchema } from "./tenant";

export const meetingTypeSchema = z.enum(["exec", "general", "committee"]);

export const motionResultSchema = z.enum(["carried", "defeated", "tabled"]);

export const motionVoteSchema = z
  .object({
    for: z.number().int().min(0).max(10000),
    against: z.number().int().min(0).max(10000),
    abstain: z.number().int().min(0).max(10000),
  })
  .strict();

export const motionSchema = z
  .object({
    text: z.string().min(1).max(2000),
    movedBy: z.string().min(1).max(200),
    secondedBy: z.string().min(1).max(200),
    vote: motionVoteSchema,
    result: motionResultSchema,
  })
  .strict();

/** POST /api/minutes — tenant ids come from the session, never the body. */
export const createMeetingMinutesSchema = z
  .object({
    meetingDate: isoDateTimeSchema,
    meetingType: meetingTypeSchema,
    attendees: z.array(z.string().min(1).max(200)).max(200),
    motions: z.array(motionSchema).max(100),
    notes: z.string().max(20000),
  })
  .strict();

/** PATCH /api/minutes/[id] — allowlist only; approved minutes are immutable. */
export const updateMeetingMinutesSchema = z
  .object({
    meetingDate: isoDateTimeSchema,
    meetingType: meetingTypeSchema,
    attendees: z.array(z.string().min(1).max(200)).max(200),
    motions: z.array(motionSchema).max(100),
    notes: z.string().max(20000),
  })
  .partial()
  .strict();
