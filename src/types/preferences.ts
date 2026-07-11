export type FontSize = "default" | "large" | "larger" | "maximum";

export interface UserPreferences {
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
  /** Steward-only: compact read-first UI that hides write actions */
  stewardMobileMode: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  fontSize: "default",
  highContrast: false,
  reducedMotion: false,
  stewardMobileMode: false,
};
