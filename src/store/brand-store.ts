"use client";

import { create } from "zustand";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { resolveHostBrandDefaults } from "@/lib/constants/host-brand";
import {
  brandFieldsFromUnionPreset,
  getUnionPreset,
} from "@/lib/constants/unionPresets";
import { resolveTrustedPresetId } from "@/lib/brand/union-preset-bridge";
import { brandThemeToKitPatch } from "@/lib/brand/union-brand-theme";
import type { UnionBrandTheme } from "@/lib/brand/union-brand-theme";
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
  /** Epoch ms of last successful Brand Kit persist — drives save banner. */
  lastSavedAt: number | null;
  /** A kit was loaded from or successfully written to this browser. */
  hasStoredBrandKit: boolean;
  setBrandKit: (kit: BrandKitPatch) => void;
  /** Apply a trusted Comms preset (preserves local number when set). */
  applyUnionPresetId: (presetId: string) => boolean;
  /** Apply operator theme colours/fonts on top of the current kit. */
  applyBrandTheme: (theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    headlineFontId?: string;
    bodyFontId?: string;
  }) => void;
  resetBrandKit: () => void;
  importBrandKit: (kit: BrandKit | unknown) => void;
  setOnboardingComplete: (complete: boolean) => void;
  dismissStorageBlocked: () => void;
  hydrate: () => Promise<void>;
}

let persistenceUnsub: (() => void) | null = null;
let saveBrandKitTimer: ReturnType<typeof setTimeout> | null = null;
/** Latest kit waiting for debounced persist — flushed on pagehide. */
let pendingSaveKit: BrandKit | null = null;
/** Patches made before hydrate — applied onto the loaded kit, never onto defaults. */
let pendingPatch: BrandKitPatch | null = null;

const LOGO_PATCH_KEYS = [
  "useOfficialLogo",
  "customLogoDataUrl",
  "officialLogoVariant",
  "identityPackId",
] as const satisfies readonly (keyof BrandKitPatch)[];

function patchTouchesLogo(partial: BrandKitPatch): boolean {
  return LOGO_PATCH_KEYS.some((key) => key in partial);
}

function flushPendingBrandKitSave(onSaved?: () => void) {
  if (saveBrandKitTimer) {
    clearTimeout(saveBrandKitTimer);
    saveBrandKitTimer = null;
  }
  const kit = pendingSaveKit;
  pendingSaveKit = null;
  if (kit) {
    void Promise.resolve(dataAdapter.saveBrandKit(kit)).then(() => {
      onSaved?.();
    });
  }
}

function scheduleSaveBrandKit(
  kit: BrandKit,
  immediate = false,
  onSaved?: () => void,
) {
  pendingSaveKit = kit;
  if (saveBrandKitTimer) clearTimeout(saveBrandKitTimer);
  if (immediate) {
    flushPendingBrandKitSave(onSaved);
    return;
  }
  saveBrandKitTimer = setTimeout(() => flushPendingBrandKitSave(onSaved), 400);
}

function clearSaveTimer() {
  if (saveBrandKitTimer) {
    clearTimeout(saveBrandKitTimer);
    saveBrandKitTimer = null;
  }
  pendingSaveKit = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    flushPendingBrandKitSave();
  });
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
  lastSavedAt: null,
  hasStoredBrandKit: false,

  setBrandKit: (partial) => {
    if (!get().hydrated) {
      pendingPatch = queueBrandKitPatch(pendingPatch, partial);
      return;
    }
    const updated = applyBrandKitPatch(get().brandKit, partial);
    set({ brandKit: updated });
    scheduleSaveBrandKit(updated, patchTouchesLogo(partial), () => {
      if (!get().storageBlocked) {
        set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
      }
    });
  },

  applyUnionPresetId: (presetId) => {
    const trusted = resolveTrustedPresetId(presetId);
    if (!trusted) return false;
    const preset = getUnionPreset(trusted);
    if (!preset) return false;
    const current = get().brandKit;
    const patch = brandFieldsFromUnionPreset(preset, {
      localNumber: current.local.localNumber,
    });
    if (!get().hydrated) {
      pendingPatch = queueBrandKitPatch(pendingPatch, patch);
      return true;
    }
    const updated = applyBrandKitPatch(current, patch);
    set({ brandKit: updated });
    scheduleSaveBrandKit(updated, true, () => {
      if (!get().storageBlocked) {
        set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
      }
    });
    return true;
  },

  applyBrandTheme: (theme) => {
    const parsed = theme as UnionBrandTheme;
    const patch = brandThemeToKitPatch(parsed);
    if (!get().hydrated) {
      pendingPatch = mergeBrandKitPatch(pendingPatch, patch);
      return;
    }
    const updated = applyBrandKitPatch(get().brandKit, patch);
    set({ brandKit: updated });
    scheduleSaveBrandKit(updated, false, () => {
      if (!get().storageBlocked) {
        set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
      }
    });
  },

  resetBrandKit: () => {
    pendingPatch = null;
    clearSaveTimer();
    // Factory reset: clear host-baked local number / collections so stewards
    // are not left with leftover test identity after "Reset to defaults".
    const reset = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      unionPresetId: undefined,
      opseuSectorId: undefined,
      identityPackId: undefined,
      profiles: [
        {
          id: "profile-local",
          label: "Local",
          localNumber: "",
          subText: "",
        },
      ],
      activeProfileId: "profile-local",
      local: {
        ...DEFAULT_BRAND_KIT.local,
        localNumber: "",
        subText: "",
        bargainingUnitCode: undefined,
      },
      updatedAt: new Date().toISOString(),
    });
    set({ brandKit: reset, lastSavedAt: null, hasStoredBrandKit: true });
    void Promise.resolve(dataAdapter.saveBrandKit(reset)).then(() => {
      if (!get().storageBlocked) {
        set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
      }
    });
  },

  importBrandKit: (kit) => {
    pendingPatch = null;
    clearSaveTimer();
    const updated = normalizeBrandKit({
      ...(kit as object),
      updatedAt: new Date().toISOString(),
    });
    set({ brandKit: updated });
    void Promise.resolve(dataAdapter.saveBrandKit(updated)).then(() => {
      if (!get().storageBlocked) {
        set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
      }
    });
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
    let hasStoredBrandKit = kit != null;

    // First visit: optional host-level defaults (durable overlay via API).
    if (!kit) {
      try {
        const hostRes = await fetch("/api/host-brand");
        if (hostRes.ok) {
          const host = (await hostRes.json()) as {
            primaryColor?: string;
            secondaryColor?: string;
            accentColor?: string;
            localNumber?: string;
            subText?: string;
            divisionId?: string;
            unionPresetId?: string;
          };
          brandKit = applyBrandKitPatch(brandKit, {
            primaryColor: host.primaryColor,
            secondaryColor: host.secondaryColor,
            accentColor: host.accentColor,
            local: {
              localNumber: host.localNumber ?? brandKit.local.localNumber,
              subText: host.subText ?? brandKit.local.subText,
              ...(host.divisionId
                ? { divisionId: host.divisionId }
                : {}),
            },
          });
          const hostPreset = resolveTrustedPresetId(host.unionPresetId);
          if (hostPreset) {
            const preset = getUnionPreset(hostPreset);
            if (preset) {
              brandKit = applyBrandKitPatch(
                brandKit,
                brandFieldsFromUnionPreset(preset, {
                  localNumber: brandKit.local.localNumber,
                }),
              );
              hasStoredBrandKit = true;
              scheduleSaveBrandKit(brandKit, true, () => {
                if (!get().storageBlocked) {
                  set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
                }
              });
            }
          }
        }
      } catch {
        const hostPreset = resolveTrustedPresetId(
          resolveHostBrandDefaults().unionPresetId,
        );
        if (hostPreset) {
          const preset = getUnionPreset(hostPreset);
          if (preset) {
            brandKit = applyBrandKitPatch(
              brandKit,
              brandFieldsFromUnionPreset(preset, {
                localNumber: brandKit.local.localNumber,
              }),
            );
            hasStoredBrandKit = true;
            scheduleSaveBrandKit(brandKit, true, () => {
              if (!get().storageBlocked) {
                set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
              }
            });
          }
        }
      }
    }

    if (queued) {
      brandKit = applyBrandKitPatch(brandKit, queued);
      scheduleSaveBrandKit(brandKit, false, () => {
        if (!get().storageBlocked) {
          set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
        }
      });
      hasStoredBrandKit = true;
    }
    set({ brandKit, onboardingComplete, hydrated: true, hasStoredBrandKit });
  },
}));
