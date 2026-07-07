import type { BrandKit } from "@/types/entities";
import {
  BRAND_KIT_KEY,
  ONBOARDING_KEY,
  type DataAdapter,
} from "./adapter";

export class LocalStorageAdapter implements DataAdapter {
  async getBrandKit(): Promise<BrandKit | null> {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(BRAND_KIT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BrandKit;
    } catch {
      return null;
    }
  }

  async saveBrandKit(kit: BrandKit): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(kit));
  }

  async clearBrandKit(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(BRAND_KIT_KEY);
  }

  async isOnboardingComplete(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  }

  async setOnboardingComplete(complete: boolean): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(ONBOARDING_KEY, complete ? "true" : "false");
  }
}

export const dataAdapter: DataAdapter = new LocalStorageAdapter();
