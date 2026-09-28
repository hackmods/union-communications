import { z } from "zod";

export const loadLabStartSchema = z.object({
  profile: z.enum(["smoke", "public", "hub-read", "capacity"]),
  envName: z.enum(["local", "staging", "production"]),
  baseUrl: z.string().max(500).optional(),
  vus: z.number().int().min(1).max(2000).optional(),
  durationSec: z.number().int().min(5).max(3600).optional(),
  rampSec: z.number().int().min(0).max(300).optional(),
  username: z.string().max(320).optional(),
  password: z.string().max(500).optional(),
  allowProduction: z.boolean().optional(),
});

export type LoadLabStartBody = z.infer<typeof loadLabStartSchema>;
