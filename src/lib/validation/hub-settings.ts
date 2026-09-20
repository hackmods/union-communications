import { z } from "zod";

/**
 * Loose but explicit Brand Kit shape for the `/api/brand-kit` route.
 * `.passthrough()` allows forward-compatible optional fields (logo variants,
 * links, profiles) without re-declaring the full `BrandKit` type here, while
 * still rejecting bodies that aren't a recognizable brand kit at all.
 */
export const brandKitInputSchema = z
  .object({
    version: z.enum(["1.1", "2.0"]),
    local: z.object({}).passthrough(),
    primaryColor: z.string().min(1).max(32),
    secondaryColor: z.string().min(1).max(32),
    accentColor: z.string().min(1).max(32),
    useOfficialLogo: z.boolean(),
    updatedAt: z.string().min(1).max(64),
  })
  .passthrough();

export const brandKitPutSchema = z
  .object({
    brandKit: brandKitInputSchema.nullable().optional(),
    onboardingComplete: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.brandKit !== undefined || v.onboardingComplete !== undefined, {
    message: "brandKit or onboardingComplete is required",
  });

export const userPreferencesSchema = z
  .object({
    fontSize: z.enum(["default", "large", "larger", "maximum"]),
    highContrast: z.boolean(),
    reducedMotion: z.boolean(),
    stewardMobileMode: z.boolean(),
  })
  .strict();

export const preferencesPutSchema = z
  .object({
    preferences: userPreferencesSchema,
  })
  .strict();
