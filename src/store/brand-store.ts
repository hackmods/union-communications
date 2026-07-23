"use client";

import { create } from "zustand";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import {
  dataAdapter,
  LocalStorageAdapter,
} from "@/lib/data/local-storage-adapter";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { BrandKit, BrandKitPatch } from "@/types/entities";

interface BrandState {
  brandKit: BrandKit;
  onboardingComplete: boolean;
  hydrated: boolean;
  /** True when localStorage refused a write (quota / private mode). */
  storageBlocked: boolean;
  setBrandKit: (kit: BrandKitPatch) => void;
  resetBrandKit: () => void;
  importBrandKit: (kit: BrandKit | unknown) => void;
  setOnboardingComplete: (complete: boolean) => void;
  dismissStorageBlocked: () => void;
  hydrate: () => Promise<void>;
}

let persistenceUnsub: (() => void) | null = null;

function ensurePersistenceSubscription(
  set: (partial: Partial<BrandState>) => void,
) {
  if (persistenceUnsub) return;
  if (!(dataAdapter instanceof LocalStorageAdapter)) return;
  persistenceUnsub = dataAdapter.subscribePersistenceBlocked((blocked) => {
    if (blocked) set({ storageBlocked: true });
  });
}

export const useBrandStore = create<BrandState>()((set, get) => ({
  brandKit: DEFAULT_BRAND_KIT,
  onboardingComplete: false,
  hydrated: false,
  storageBlocked: false,

  setBrandKit: (partial) => {
    const current = get().brandKit;
    const updated = normalizeBrandKit({
      ...current,
      ...partial,
      local: { ...current.local, ...partial.local },
      customLinks:
        partial.customLinks !== undefined
          ? partial.customLinks
          : current.customLinks,
      membershipUrls:
        partial.membershipUrls !== undefined
          ? partial.membershipUrls
          : current.membershipUrls,
      updatedAt: new Date().toISOString(),
    });
    set({ brandKit: updated });
    void dataAdapter.saveBrandKit(updated);
  },

  resetBrandKit: () => {
    const reset = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      updatedAt: new Date().toISOString(),
    });
    set({ brandKit: reset });
    void dataAdapter.clearBrandKit();
  },

  importBrandKit: (kit) => {
    const updated = normalizeBrandKit({
      ...(kit as object),
      updatedAt: new Date().toISOString(),
    });
    set({ brandKit: updated });
    void dataAdapter.saveBrandKit(updated);
  },

  setOnboardingComplete: (complete) => {
    set({ onboardingComplete: complete });
    void dataAdapter.setOnboardingComplete(complete);
  },

  dismissStorageBlocked: () => {
    if (dataAdapter instanceof LocalStorageAdapter) {
      dataAdapter.dismissPersistenceBlocked();
    }
    set({ storageBlocked: false });
  },

  hydrate: async () => {
    ensurePersistenceSubscription(set);
    const kit = await dataAdapter.getBrandKit();
    const onboardingComplete = await dataAdapter.isOnboardingComplete();
    if (kit) set({ brandKit: kit });
    set({ onboardingComplete, hydrated: true });
  },
}));
