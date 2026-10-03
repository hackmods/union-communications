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
import { LocalStorageAdapter } from "@/lib/data/local-storage-adapter";
import { getDataAdapter } from "@/lib/data/get-data-adapter";
import { apiAdapter } from "@/lib/data/api-adapter";
import type { BrandKitSyncSource } from "@/lib/data/api-adapter";
import type { DataAdapter } from "@/lib/data/adapter";
import { readBrowserBrandKit } from "@/lib/data/mirror-brand-kit";
import { brandKitsMeaningfullyDiffer } from "@/lib/brand/brand-kit-diff";
import { syncBrandKitProfilesFromLocal } from "@/lib/brand/collection-profiles";
import { alignOpseuMembershipPrimary } from "@/lib/brand/membership-primary";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { BrandKit, BrandKitPatch } from "@/types/entities";

function activeAdapter(): DataAdapter {
  return getDataAdapter();
}

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
  /** Hybrid sync metadata from last authenticated `/api/brand-kit` GET/PUT. */
  syncSource: BrandKitSyncSource | null;
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
  /** Publish current kit as Local shared defaults (ApiAdapter only). */
  publishLocalBrandKit: () => Promise<boolean>;
  hydrate: () => Promise<void>;
}

let persistenceUnsub: (() => void) | null = null;
let saveBrandKitTimer: ReturnType<typeof setTimeout> | null = null;
/** Latest kit waiting for debounced persist â€” flushed on pagehide. */
let pendingSaveKit: BrandKit | null = null;
/** Patches made before hydrate â€” applied onto the loaded kit, never onto defaults. */
let pendingPatch: BrandKitPatch | null = null;
/** Import/reset requested while hydration awaits a host response. */
let pendingReplacement: BrandKit | null = null;

const LOGO_PATCH_KEYS = [
  "useOfficialLogo",
  "customLogoDataUrl",
  "officialLogoVariant",
  "identityPackId",
] as const satisfies readonly (keyof BrandKitPatch)[];

function patchTouchesLogo(partial: BrandKitPatch): boolean {
  return LOGO_PATCH_KEYS.some((key) => key in partial);
}

function patchNeedsImmediateSave(partial: BrandKitPatch): boolean {
  return (
    patchTouchesLogo(partial) ||
    "designTreatment" in partial ||
    // Preset switches drive Local pack / Look exports â€” do not wait on debounce.
    "unionPresetId" in partial
  );
}

function flushPendingBrandKitSave(onSaved?: () => void) {
  if (saveBrandKitTimer) {
    clearTimeout(saveBrandKitTimer);
    saveBrandKitTimer = null;
  }
  const kit = pendingSaveKit;
  pendingSaveKit = null;
  if (kit) {
    // Invoke immediately so localStorage writes land before navigation tears
    // down the document (async `then` microtasks can be cancelled on unload).
    const result = activeAdapter().saveBrandKit(kit);
    void Promise.resolve(result).then(() => {
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
  const adapter = activeAdapter();
  if (!(adapter instanceof LocalStorageAdapter)) return;
  persistenceUnsub = adapter.subscribePersistenceBlocked((blocked) => {
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
  syncSource: null,

  setBrandKit: (partial) => {
    if (!get().hydrated) {
      pendingPatch = queueBrandKitPatch(pendingPatch, partial);
      set({ brandKit: applyBrandKitPatch(get().brandKit, partial) });
      return;
    }
    const updated = applyBrandKitPatch(get().brandKit, partial);
    set({ brandKit: updated });
    scheduleSaveBrandKit(updated, patchNeedsImmediateSave(partial), () => {
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
      set({ brandKit: applyBrandKitPatch(current, patch) });
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
      pendingPatch = queueBrandKitPatch(pendingPatch, patch);
      set({ brandKit: applyBrandKitPatch(get().brandKit, patch) });
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
    pendingReplacement = get().hydrated ? null : reset;
    set({ brandKit: reset, lastSavedAt: null, hasStoredBrandKit: true });
    void Promise.resolve(activeAdapter().saveBrandKit(reset)).then(() => {
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
    pendingReplacement = get().hydrated ? null : updated;
    set({ brandKit: updated });
    void Promise.resolve(activeAdapter().saveBrandKit(updated)).then(() => {
      if (!get().storageBlocked) {
        set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
      }
    });
  },

  setOnboardingComplete: (complete) => {
    set({ onboardingComplete: complete });
    void activeAdapter().setOnboardingComplete(complete);
  },

  dismissStorageBlocked: () => {
    const adapter = activeAdapter();
    if (adapter instanceof LocalStorageAdapter) {
      adapter.dismissPersistenceBlocked();
    }
    set({ storageBlocked: false });
  },

  publishLocalBrandKit: async () => {
    const kit = get().brandKit;
    const ok = await apiAdapter.publishLocalBrandKit(kit);
    if (ok) {
      set({
        lastSavedAt: Date.now(),
        hasStoredBrandKit: true,
        syncSource: apiAdapter.lastSyncSource,
      });
    }
    return ok;
  },

  hydrate: async () => {
    ensurePersistenceSubscription(set);
    const adapter = activeAdapter();
    // Capture on-device kit before Api GET mirrors Hub seed into localStorage.
    const browserKitBefore =
      adapter === apiAdapter ? await readBrowserBrandKit() : null;
    let kit = await adapter.getBrandKit();
    const onboardingComplete = await adapter.isOnboardingComplete();
    let syncSource =
      adapter === apiAdapter ? apiAdapter.lastSyncSource : null;

    // One-time: empty Hub Local + empty personal → promote browser kit.
    if (
      adapter === apiAdapter &&
      syncSource &&
      !syncSource.hasLocalShared &&
      !syncSource.hasPersonalOverlay
    ) {
      const hubKit = kit ?? get().brandKit;
      if (
        browserKitBefore &&
        brandKitsMeaningfullyDiffer(browserKitBefore, hubKit)
      ) {
        await apiAdapter.saveBrandKit(browserKitBefore);
        kit = await apiAdapter.getBrandKit();
        syncSource = apiAdapter.lastSyncSource;
      }
    }

    let brandKit = kit ?? get().brandKit;
    let hasStoredBrandKit = kit != null;

    // First visit (anonymous / on-device only): optional host-level defaults.
    // Authenticated ApiAdapter resolve already seeds Local shared on the server.
    if (!kit && adapter !== apiAdapter) {
      try {
        const hostRes = await fetch("/api/host-brand", {
          signal: AbortSignal.timeout(5_000),
        });
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

    // Import/reset and ordinary edits may arrive while host defaults load.
    // Apply them after the lookup so hydration cannot overwrite steward work.
    if (pendingReplacement) {
      brandKit = pendingReplacement;
      hasStoredBrandKit = true;
      pendingReplacement = null;
    }
    const queued = pendingPatch;
    pendingPatch = null;
    if (queued) {
      brandKit = applyBrandKitPatch(brandKit, queued);
      // Steward edits while host defaults loaded must land in localStorage
      // before the next navigation (Local pack export, E2E polls).
      scheduleSaveBrandKit(brandKit, true, () => {
        if (!get().storageBlocked) {
          set({ lastSavedAt: Date.now(), hasStoredBrandKit: true });
        }
      });
      hasStoredBrandKit = true;
    }
    set({
      brandKit,
      onboardingComplete,
      hydrated: true,
      hasStoredBrandKit,
      syncSource,
    });
  },
}));

