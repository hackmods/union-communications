import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";

export interface DataAdapter {
  getBrandKit(): Promise<BrandKit | null>;
  saveBrandKit(kit: BrandKit): Promise<void>;
  clearBrandKit(): Promise<void>;
  isOnboardingComplete(): Promise<boolean>;
  setOnboardingComplete(complete: boolean): Promise<void>;
  getUserPreferences(): Promise<UserPreferences | null>;
  saveUserPreferences(prefs: UserPreferences): Promise<void>;
}

/** Canonical Brand Kit storage key (TOOL-007). */
export const BRAND_KIT_KEY = "unionops-brand-kit";
/** Canonical onboarding flag key (TOOL-007). */
export const ONBOARDING_KEY = "unionops-onboarding-complete";
export const USER_PREFERENCES_KEY = "lunion-user-preferences";

/** Pre-rebrand keys — read once and migrate to the canonical names. */
export const LEGACY_BRAND_KIT_KEY = "opseu-brand-kit";
export const LEGACY_ONBOARDING_KEY = "opseu-onboarding-complete";
