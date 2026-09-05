export type FontSize = "default" | "large" | "larger" | "maximum";

/** Officer Learning training-page colour. Navy is default; light is opt-in. */
export type OfficerLearningColour = "navy" | "light";

export interface UserPreferences {
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
  /** Steward-only: compact read-first UI that hides write actions */
  stewardMobileMode: boolean;
  /** Navy training shell, or light platform chrome. Does not affect other guides. */
  officerLearningColour: OfficerLearningColour;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  fontSize: "default",
  highContrast: false,
  reducedMotion: false,
  stewardMobileMode: false,
  officerLearningColour: "navy",
};

export function resolveOfficerLearningColour(
  value: unknown,
): OfficerLearningColour {
  return value === "light" ? "light" : "navy";
}
