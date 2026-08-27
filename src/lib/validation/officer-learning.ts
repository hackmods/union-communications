import { z } from "zod";

const moduleProgressSchema = z
  .object({
    status: z.enum(["not_started", "in_progress", "completed"]),
    scrollDepth: z.number().min(0).max(100),
    quizPassed: z.boolean(),
    lastVisitedAt: z.string().max(64).optional(),
  })
  .strict();

export const officerLearningMePutSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    hubSyncEnabled: z.boolean(),
    shareWithLocal: z.boolean(),
    modules: z.record(moduleProgressSchema),
  })
  .strict()
  .refine((v) => !v.shareWithLocal || v.hubSyncEnabled, {
    message: "shareWithLocal requires hubSyncEnabled",
    path: ["shareWithLocal"],
  });

export const officerLearningLocalSettingsPutSchema = z
  .object({
    reportingEnabled: z.boolean(),
  })
  .strict();
