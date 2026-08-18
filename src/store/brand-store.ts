"use client";

import { create } from "zustand";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import {
  dataAdapter,
  LocalStorageAdapter,
} from "@/lib/data/local-storage-adapter";
import { syncBrandKitProfilesFromLocal } from "@/lib/brand/collection-profiles";
import { alignOpseuMembershipPrimary } from "@/lib/brand/membership-primary";
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
let saveBrandKitTimer: ReturnType<typeof setTimeout> | null = null;
/** Patches made before hydrate — applied onto the loaded kit, never onto defaults. */
let pendingPatch: BrandKitPatch | null = null;

function scheduleSaveBrandKit(kit: BrandKit) {
  if (saveBrandKitTimer) clearTimeout(saveBrandKitTimer);
  saveBrandKitTimer = setTimeout(() => {
    saveBrandKitTimer = null;
    void dataAdapter.saveBrandKit(kit);
  }, 400);
}

function clearSaveTimer() {
  if (saveBrandKitTimer) {
    clearTimeout(saveBrandKitTimer);
    saveBrandKitTimer = null;
  }
}

function applyBrandKitPatch(current: BrandKit, partial: BrandKitPatch): BrandKit {
  const updated = syncBrandKitProfilesFromLocal(
    normalizeBrandKit({
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
      canvas: "canvas" in partial ? (partial.canvas ?? undefined) : current.canvas,
      updatedAt: new Date().toISOString(),
    }),
  );
  if (partial.activeProfileId !== undefined || partial.profiles !== undefined) {
    return alignOpseuMembershipPrimary(updated);
  }
  return updated;
}

function queueBrandKitPatch(
  queued: BrandKitPatch | null,
  next: BrandKitPatch,
): BrandKitPatch {
  if (!queued) return next;
  const canvas =
    "canvas" in next
      ? next.canvas == null
        ? next.canvas
        : { ...(queued.canvas ?? {}), ...next.canvas }
      : queued.canvas;
  return {
    ...queued,
    ...next,
    local:
      queued.local || next.local
        ? { ...queued.local, ...next.local }
        : undefined,
    customLinks:
      next.customLinks !== undefined ? next.customLinks : queued.customLinks,
    membershipUrls:
      next.membershipUrls !== undefined
        ? next.membershipUrls
        : queued.membershipUrls,
    canvas,
  };
}

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
    if (!get().hydrated) {
      pendingPatch = queueBrandKitPatch(pendingPatch, partial);
      return;
    }
    const updated = applyBrandKitPatch(get().brandKit, partial);
    set({ brandKit: updated });
    scheduleSaveBrandKit(updated);
  },

  resetBrandKit: () => {
    pendingPatch = null;
    clearSaveTimer();
    const reset = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      updatedAt: new Date().toISOString(),
    });
    set({ brandKit: reset });
    void dataAdapter.clearBrandKit();
  },

  importBrandKit: (kit) => {
    pendingPatch = null;
    clearSaveTimer();
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
    const queued = pendingPatch;
    pendingPatch = null;
    let brandKit = kit ?? get().brandKit;
    if (queued) {
      brandKit = applyBrandKitPatch(brandKit, queued);
      scheduleSaveBrandKit(brandKit);
    }
    set({ brandKit, onboardingComplete, hydrated: true });
  },
}));
