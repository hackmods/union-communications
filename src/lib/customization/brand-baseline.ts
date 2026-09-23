import type { BrandKitPatch } from "@/types/entities";
import type { AuthorizedBrandDto } from "@/lib/customization/types";

/** Explicit Brand Kit application only — never auto-overwrite a saved kit. */
export function brandBaselineToPatch(content: AuthorizedBrandDto): BrandKitPatch {
  const payload = content.payload as {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    headlineFontId?: string;
    bodyFontId?: string;
  };
  return {
    primaryColor: typeof payload.primaryColor === "string" ? payload.primaryColor : undefined,
    secondaryColor: typeof payload.secondaryColor === "string" ? payload.secondaryColor : undefined,
    accentColor: typeof payload.accentColor === "string" ? payload.accentColor : undefined,
    canvas: {
      headlineFontId: typeof payload.headlineFontId === "string" ? payload.headlineFontId : undefined,
      bodyFontId: typeof payload.bodyFontId === "string" ? payload.bodyFontId : undefined,
    },
  };
}

export type AppliedBaselineRecord = {
  resourceKey: "brand:baseline";
  releaseId?: string;
  appliedAt: string;
};
