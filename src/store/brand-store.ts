"use client";

import { create } from "zustand";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { dataAdapter } from "@/lib/data/local-storage-adapter";
import type { BrandKit } from "@/types/entities";

interface BrandState {
  brandKit: BrandKit;
  onboardingComplete: boolean;
  hydrated: boolean;
  setBrandKit: (kit: Partial<BrandKit>) => void;
  resetBrandKit: () => void;
  importBrandKit: (kit: BrandKit) => void;
  setOnboardingComplete: (complete: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useBrandStore = create<BrandState>()((set, get) => ({
  brandKit: DEFAULT_BRAND_KIT,
  onboardingComplete: false,
  hydrated: false,

  setBrandKit: (partial) => {
    const updated = {
      ...get().brandKit,
      ...partial,
      local: { ...get().brandKit.local, ...partial.local },
      updatedAt: new Date().toISOString(),
    };
    set({ brandKit: updated });
    void dataAdapter.saveBrandKit(updated);
  },

  resetBrandKit: () => {
    const reset = { ...DEFAULT_BRAND_KIT, updatedAt: new Date().toISOString() };
    set({ brandKit: reset });
    void dataAdapter.clearBrandKit();
  },

  importBrandKit: (kit) => {
    const updated = { ...kit, updatedAt: new Date().toISOString() };
    set({ brandKit: updated });
    void dataAdapter.saveBrandKit(updated);
  },

  setOnboardingComplete: (complete) => {
    set({ onboardingComplete: complete });
    void dataAdapter.setOnboardingComplete(complete);
  },

  hydrate: async () => {
    const kit = await dataAdapter.getBrandKit();
    const onboardingComplete = await dataAdapter.isOnboardingComplete();
    if (kit) set({ brandKit: kit });
    set({ onboardingComplete, hydrated: true });
  },
}));
