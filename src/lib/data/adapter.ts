import type { BrandKit } from "@/types/entities";

export interface DataAdapter {
  getBrandKit(): Promise<BrandKit | null>;
  saveBrandKit(kit: BrandKit): Promise<void>;
  clearBrandKit(): Promise<void>;
  isOnboardingComplete(): Promise<boolean>;
  setOnboardingComplete(complete: boolean): Promise<void>;
}

export const BRAND_KIT_KEY = "opseu-brand-kit";
export const ONBOARDING_KEY = "opseu-onboarding-complete";
