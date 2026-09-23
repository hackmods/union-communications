import { canonicalPublicPath } from "@/lib/seo/public-routes";

/**
 * Brand Kit preset → guide paths that should leave discovery / surface UX
 * when that preset is selected. Direct URLs still resolve; the page may
 * show a replacement message (see PresetGuideVisibility).
 *
 * OPSEU: national / staff-led bargaining — the generic contract-negotiation
 * playbook is not the right default for OPSEU locals.
 */
export const PRESET_HIDDEN_GUIDE_PATHS: Readonly<Record<string, readonly string[]>> = {
  opseu: ["/guide/bargaining"],
};

export function hiddenGuidePathsForPreset(
  unionPresetId: string | null | undefined,
): readonly string[] {
  if (!unionPresetId) return [];
  const legacy = PRESET_HIDDEN_GUIDE_PATHS[unionPresetId] ?? [];
  return [...new Set(legacy.flatMap((path) => [path, canonicalPublicPath(path)]))];
}

export function isGuideHiddenForPreset(
  path: string,
  unionPresetId: string | null | undefined,
): boolean {
  const candidates = new Set([
    path.replace(/\/$/, "") || "/",
    canonicalPublicPath(path),
  ]);
  return hiddenGuidePathsForPreset(unionPresetId).some((hidden) => candidates.has(hidden));
}
