import { getUnionPreset } from "@/lib/constants/unionPresets";
import { COMMS_SOURCES } from "@/lib/constants/comms-sources";
import { hiddenGuidePathsForPreset } from "@/lib/comms/preset-guide-visibility";

/**
 * High-level OPSEU customization starter — colours and source refs from the
 * existing Brand Kit preset and `comms-sources` registry. Does not scrape or
 * invent national content. Root still publishes through the control panel.
 */
export function opseuBrandBaselineSuggestion() {
  const preset = getUnionPreset("opseu");
  if (!preset) return null;
  return {
    resourceKey: "brand:baseline" as const,
    label: { en: "OPSEU / SEFPO brand baseline", fr: "Base de marque OPSEU / SEFPO" },
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    accentColor: preset.accentColor ?? preset.primaryColor,
    headlineFontId: "montserrat",
    bodyFontId: "sourceSans",
    notes: [
      "Apply only after Root review — volunteers still use explicit Brand Kit Apply.",
      "Official logos stay on Brand Kit upload / identity pack paths; do not republish marks into customization assets without rights.",
    ],
  };
}

/** Division-shaped contexts Root typically creates for CAAT-style tenants. */
export const OPSEU_SUGGESTED_DIVISION_LABELS = [
  { code: "academic", en: "Academic", fr: "Corps enseignant" },
  { code: "support", en: "Support Staff", fr: "Personnel de soutien" },
] as const;

export function opseuRecommendedSourceIds(): string[] {
  return Object.values(COMMS_SOURCES)
    .filter((source) => source.unionIds?.includes("opseu"))
    .map((source) => source.id)
    .sort();
}

export function opseuPilotChecklist() {
  return {
    presetId: "opseu",
    brand: opseuBrandBaselineSuggestion(),
    hiddenGuides: hiddenGuidePathsForPreset("opseu"),
    divisionLabels: OPSEU_SUGGESTED_DIVISION_LABELS,
    sourceIds: opseuRecommendedSourceIds(),
    operatorNotes: [
      "Create the real union scope in Site Admin → Customization; do not invite members from scope creation.",
      "Publish brand:baseline from the suggestion colours, then ask stewards to Apply in Brand Kit.",
      "Leave /guide/bargaining compiled but hidden for the OPSEU Brand Kit preset — national/staff lead negotiations.",
      "Prefer linking OPSEU sources from the registry over copying national page text into guides.",
    ],
  };
}
