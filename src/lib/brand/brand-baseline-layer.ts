import type { UnionBrandTheme } from "@/lib/brand/union-brand-theme";

/** Pure layer builder — unit-tested; used by draftBrandBaselineFromTheme. */
export function buildBrandBaselineLayerFromTheme(input: {
  scopeId: string;
  unionName: string;
  theme: UnionBrandTheme;
  logoAssetId?: string | null;
}) {
  const key = "brand:baseline" as const;
  return {
    schemaVersion: 1 as const,
    key,
    scopeId: input.scopeId,
    revisionId: "draft-brand-styles",
    mode: "define" as const,
    resource: {
      schemaVersion: 1 as const,
      key,
      policy: {
        audience: "public" as const,
        enabled: true,
        editableFields: [
          "label",
          "primaryColor",
          "secondaryColor",
          "accentColor",
          "headlineFontId",
          "bodyFontId",
          "logoAssetId",
        ],
      },
      payload: {
        kind: "brand" as const,
        label: {
          en: `${input.unionName} brand`,
          fr: `Marque ${input.unionName}`,
        },
        primaryColor: input.theme.primaryColor,
        secondaryColor: input.theme.secondaryColor,
        accentColor: input.theme.accentColor,
        headlineFontId: input.theme.headlineFontId ?? "montserrat",
        bodyFontId: input.theme.bodyFontId ?? "sourceSans",
        logoAssetId:
          input.logoAssetId === undefined ? null : input.logoAssetId,
      },
    },
  };
}
