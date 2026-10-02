/**
 * Hub Brand Kit + preferences store (hybrid Local shared + personal overlay).
 * Memory-backed by default; Postgres when `HUB_SETTINGS_DB_BACKEND=postgres`.
 */

import { canPublishLocalBrand } from "@/lib/brand/local-brand-access";
import {
  applyBrandKitOverlay,
  computePersonalOverlay,
  overlayHasContent,
  pruneOverlayAgainstLocal,
  resolveEffectiveBrandKit,
} from "@/lib/brand/resolve-effective-brand-kit";
import { brandFieldsFromUnionPreset, getUnionPreset } from "@/lib/constants/unionPresets";
import { resolvePresetIdFromUnionId } from "@/lib/brand/union-preset-bridge";
import {
  brandThemeToKitPatch,
  parseUnionBrandTheme,
} from "@/lib/brand/union-brand-theme";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import { getTenantByUnionId } from "@/lib/tenant/loader";
import { resolveCommsPreset } from "@/lib/brand/comms-preset-catalog";
import { findPresetBinding } from "@/lib/brand/preset-bindings-store";
import { trySeedBrandBaselinePatch } from "@/lib/brand/baseline-empty-seed";
import type { BrandKit, BrandKitPatch } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";
import type { UserRole } from "@/types/tenant";

export interface HubBrandKitRecord {
  brandKit: BrandKit | null;
  onboardingComplete: boolean;
  /** Present on GET responses for authenticated hybrid resolve. */
  source?: {
    hasLocalShared: boolean;
    hasPersonalOverlay: boolean;
    canPublishLocal: boolean;
  };
}

export type BrandKitWriteScope = "personal" | "local";

export interface ResolveBrandContext {
  userId: string;
  unionId?: string;
  localId?: string;
  roles?: UserRole[];
  sectorId?: string | null;
}

const localBrandStore = new Map<string, BrandKit>();
const personalOverlayStore = new Map<
  string,
  { overlay: BrandKitPatch; onboardingComplete: boolean }
>();
const preferencesStore = new Map<string, UserPreferences>();

/** @deprecated per-user full kit key — prefer local + personal helpers */
export function hubSettingsKey(userId: string, unionId?: string): string {
  return `${unionId ?? "solo"}:${userId}`;
}

export function localBrandKey(unionId: string, localId: string): string {
  return `${unionId}:${localId}`;
}

export function personalBrandKey(userId: string, unionId?: string): string {
  return hubSettingsKey(userId, unionId);
}

export function getLocalBrandKit(
  unionId: string,
  localId: string,
): BrandKit | null {
  return localBrandStore.get(localBrandKey(unionId, localId)) ?? null;
}

export function saveLocalBrandKit(
  unionId: string,
  localId: string,
  kit: BrandKit,
): BrandKit {
  const next = normalizeBrandKit({
    ...kit,
    updatedAt: new Date().toISOString(),
  });
  localBrandStore.set(localBrandKey(unionId, localId), next);
  return next;
}

export function getPersonalBrandRecord(
  userId: string,
  unionId?: string,
): { overlay: BrandKitPatch; onboardingComplete: boolean } {
  return (
    personalOverlayStore.get(personalBrandKey(userId, unionId)) ?? {
      overlay: {},
      onboardingComplete: false,
    }
  );
}

export function savePersonalBrandRecord(
  userId: string,
  unionId: string | undefined,
  patch: {
    overlay?: BrandKitPatch;
    onboardingComplete?: boolean;
  },
): { overlay: BrandKitPatch; onboardingComplete: boolean } {
  const key = personalBrandKey(userId, unionId);
  const existing = getPersonalBrandRecord(userId, unionId);
  const next = {
    overlay: patch.overlay !== undefined ? patch.overlay : existing.overlay,
    onboardingComplete:
      patch.onboardingComplete !== undefined
        ? patch.onboardingComplete
        : existing.onboardingComplete,
  };
  personalOverlayStore.set(key, next);
  return next;
}

/** Legacy helper used by older tests — reads personal-only effective when no local. */
export function getHubBrandKitRecord(key: string): HubBrandKitRecord {
  const [unionId, userId] = key.includes(":")
    ? (key.split(":") as [string, string])
    : ["solo", key];
  const personal = getPersonalBrandRecord(userId, unionId === "solo" ? undefined : unionId);
  const effective = resolveEffectiveBrandKit(null, personal.overlay);
  return {
    brandKit: effective,
    onboardingComplete: personal.onboardingComplete,
  };
}

/** Legacy helper — writes a personal full-kit overlay. */
export function saveHubBrandKitRecord(
  key: string,
  patch: Partial<HubBrandKitRecord>,
): HubBrandKitRecord {
  const [unionIdRaw, userId] = key.includes(":")
    ? (key.split(":") as [string, string])
    : ["solo", key];
  const unionId = unionIdRaw === "solo" ? undefined : unionIdRaw;
  const existing = getPersonalBrandRecord(userId, unionId);
  const overlay =
    patch.brandKit === undefined
      ? existing.overlay
      : patch.brandKit
        ? ({ ...patch.brandKit } as BrandKitPatch)
        : {};
  const next = savePersonalBrandRecord(userId, unionId, {
    overlay,
    onboardingComplete: patch.onboardingComplete,
  });
  return {
    brandKit: resolveEffectiveBrandKit(null, next.overlay),
    onboardingComplete: next.onboardingComplete,
  };
}

function seedKitFromUnion(ctx: ResolveBrandContext): BrandKit {
  const unionId = ctx.unionId;
  const binding = findPresetBinding({
    unionId,
    sectorId: ctx.sectorId,
  });
  const boundPresetId = binding?.presetId ?? null;
  const presetId = resolvePresetIdFromUnionId(unionId, { boundPresetId });
  const seed = unionId ? getTenantByUnionId(unionId) : undefined;
  const theme = seed
    ? parseUnionBrandTheme(seed.brandDefaults.brandTheme)
    : null;

  let kit = normalizeBrandKit({ ...DEFAULT_BRAND_KIT });

  const baselinePatch = trySeedBrandBaselinePatch(ctx);
  if (baselinePatch) {
    kit = applyBrandKitOverlay(kit, baselinePatch);
  }

  const resolved = presetId ? resolveCommsPreset(presetId) : null;
  const compiled = presetId ? getUnionPreset(presetId) : undefined;
  const preset = resolved?.compiled ?? compiled;
  if (preset) {
    kit = applyBrandKitOverlay(
      kit,
      brandFieldsFromUnionPreset(preset, {
        localNumber: kit.local.localNumber,
      }),
    );
  }
  if (theme) {
    kit = applyBrandKitOverlay(kit, brandThemeToKitPatch(theme));
  }
  if (unionId) {
    kit = { ...kit, unionId };
  }
  return kit;
}

/**
 * Resolve effective Brand Kit for a Hub session.
 * Seeds Local shared once when missing and `localId` is present.
 */
export function resolveHubBrandKit(ctx: ResolveBrandContext): HubBrandKitRecord {
  const { userId, unionId, localId, roles } = ctx;
  const personal = getPersonalBrandRecord(userId, unionId);
  let localShared: BrandKit | null = null;

  if (unionId && localId) {
    localShared = getLocalBrandKit(unionId, localId);
    if (!localShared) {
      const seeded = seedKitFromUnion(ctx);
      localShared = saveLocalBrandKit(unionId, localId, seeded);
    }
  }

  const effective = resolveEffectiveBrandKit(localShared, personal.overlay);
  return {
    brandKit: effective,
    onboardingComplete: personal.onboardingComplete,
    source: {
      hasLocalShared: Boolean(localShared),
      hasPersonalOverlay: overlayHasContent(personal.overlay),
      canPublishLocal: canPublishLocalBrand(roles),
    },
  };
}

export function writeHubBrandKit(
  ctx: ResolveBrandContext,
  input: {
    scope: BrandKitWriteScope;
    brandKit?: BrandKit | null;
    onboardingComplete?: boolean;
  },
): HubBrandKitRecord {
  const { userId, unionId, localId, roles } = ctx;

  if (input.onboardingComplete !== undefined) {
    savePersonalBrandRecord(userId, unionId, {
      onboardingComplete: input.onboardingComplete,
    });
  }

  if (input.brandKit !== undefined) {
    if (input.brandKit === null) {
      if (input.scope === "local") {
        if (!canPublishLocalBrand(roles) || !unionId || !localId) {
          throw new Error("forbidden_local_write");
        }
        localBrandStore.delete(localBrandKey(unionId, localId));
      } else {
        savePersonalBrandRecord(userId, unionId, { overlay: {} });
      }
    } else if (input.scope === "local") {
      if (!canPublishLocalBrand(roles) || !unionId || !localId) {
        throw new Error("forbidden_local_write");
      }
      const saved = saveLocalBrandKit(unionId, localId, input.brandKit);
      const personal = getPersonalBrandRecord(userId, unionId);
      savePersonalBrandRecord(userId, unionId, {
        overlay: pruneOverlayAgainstLocal(saved, personal.overlay),
      });
    } else {
      const localShared =
        unionId && localId ? getLocalBrandKit(unionId, localId) : null;
      const overlay = computePersonalOverlay(localShared, input.brandKit);
      savePersonalBrandRecord(userId, unionId, { overlay });
    }
  }

  return resolveHubBrandKit(ctx);
}

export function clearPersonalBrandKit(
  ctx: ResolveBrandContext,
): HubBrandKitRecord {
  savePersonalBrandRecord(ctx.userId, ctx.unionId, { overlay: {} });
  return resolveHubBrandKit(ctx);
}

export function getHubPreferences(key: string): UserPreferences | null {
  return preferencesStore.get(key) ?? null;
}

export function saveHubPreferences(
  key: string,
  prefs: UserPreferences,
): void {
  preferencesStore.set(key, prefs);
}

/** @internal test helper */
export function resetHubSettingsStoreForTests(): void {
  localBrandStore.clear();
  personalOverlayStore.clear();
  preferencesStore.clear();
}
