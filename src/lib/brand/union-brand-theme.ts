import { z } from "zod";
import {
  CANVAS_FONT_ORDER,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
  isCanvasFontId,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";
import type { BrandKitPatch } from "@/types/entities";
import type { BrandDefaults } from "@/types/tenant";

const HEX = /^#[0-9A-Fa-f]{6}$/;

const fontSchema = z
  .string()
  .refine((value) => CANVAS_FONT_ORDER.includes(value as CanvasFontId), {
    message: "Unknown canvas font",
  });

/** Operator theme stored on `unions.brand_theme` / BrandDefaults. */
export const unionBrandThemeSchema = z
  .object({
    primaryColor: z.string().regex(HEX),
    secondaryColor: z.string().regex(HEX),
    accentColor: z.string().regex(HEX),
    headlineFontId: fontSchema.optional(),
    bodyFontId: fontSchema.optional(),
  })
  .strict();

export type UnionBrandTheme = z.infer<typeof unionBrandThemeSchema>;

export function parseUnionBrandTheme(raw: unknown): UnionBrandTheme | null {
  const parsed = unionBrandThemeSchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    primaryColor: parsed.data.primaryColor.toUpperCase(),
    secondaryColor: parsed.data.secondaryColor.toUpperCase(),
    accentColor: parsed.data.accentColor.toUpperCase(),
    ...(parsed.data.headlineFontId
      ? { headlineFontId: parsed.data.headlineFontId }
      : {}),
    ...(parsed.data.bodyFontId ? { bodyFontId: parsed.data.bodyFontId } : {}),
  };
}

/** Brand Kit patch from an operator theme (colours + optional canvas fonts). */
export function brandThemeToKitPatch(theme: UnionBrandTheme): BrandKitPatch {
  const headline =
    theme.headlineFontId && isCanvasFontId(theme.headlineFontId)
      ? theme.headlineFontId
      : undefined;
  const body =
    theme.bodyFontId && isCanvasFontId(theme.bodyFontId)
      ? theme.bodyFontId
      : undefined;
  return {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    ...(headline || body
      ? {
          canvas: {
            ...(headline ? { headlineFontId: headline } : {}),
            ...(body ? { bodyFontId: body } : {}),
          },
        }
      : {}),
  };
}

export function brandThemeFromDefaults(
  defaults: BrandDefaults,
): UnionBrandTheme | null {
  if (defaults.brandTheme) {
    return parseUnionBrandTheme(defaults.brandTheme);
  }
  return parseUnionBrandTheme({
    primaryColor: defaults.primaryColor,
    secondaryColor: defaults.secondaryColor,
    accentColor: defaults.accentColor,
  });
}

/** Defaults for a new theme editor row seeded from host/preset colours. */
export function emptyThemeDraft(colours: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): UnionBrandTheme {
  return {
    primaryColor: HEX.test(colours.primaryColor)
      ? colours.primaryColor.toUpperCase()
      : "#C2410C",
    secondaryColor: HEX.test(colours.secondaryColor)
      ? colours.secondaryColor.toUpperCase()
      : "#FFFFFF",
    accentColor: HEX.test(colours.accentColor)
      ? colours.accentColor.toUpperCase()
      : "#9A3412",
    headlineFontId: DEFAULT_HEADLINE_FONT,
    bodyFontId: DEFAULT_BODY_FONT,
  };
}
