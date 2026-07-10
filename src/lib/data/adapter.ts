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

export const BRAND_KIT_KEY = "opseu-brand-kit";
export const ONBOARDING_KEY = "opseu-onboarding-complete";
export const USER_PREFERENCES_KEY = "lunion-user-preferences";
