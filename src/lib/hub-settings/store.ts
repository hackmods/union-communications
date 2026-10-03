/**
 * Hub Brand Kit + preferences store (hybrid Local shared + personal overlay).
 * Memory-backed by default; Postgres when `HUB_SETTINGS_DB_BACKEND=postgres`.
 *
 * Empty Local returns an ephemeral seed for display — it is NOT persisted.
 * Officers publish Local defaults with Save as Local default (`scope: "local"`).
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
import { hubSettingsDbBackend } from "@/lib/db/backend";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import { getTenantByUnionId } from "@/lib/tenant/loader";
import { resolveCommsPreset } from "@/lib/brand/comms-preset-catalog";
import { findPresetBinding } from "@/lib/brand/preset-bindings-store";
import { trySeedBrandBaselinePatch } from "@/lib/brand/baseline-empty-seed";
import type { BrandKit, BrandKitPatch } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";
import type { UserRole } from "@/types/tenant";
import type { HubBrandSettingsAdapter } from "./adapter";
import { DrizzleHubBrandSettingsAdapter } from "./drizzle-adapter";
import { memoryHubBrandSettingsAdapter } from "./memory-adapter";
import {
  hubSettingsKey,
  localBrandKey,
  personalBrandKey,
} from "./keys";

export type { PersonalBrandRecord } from "./adapter";
export { hubSettingsKey, localBrandKey, personalBrandKey };

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

/** Preferences remain process-memory (durable prefs are a separate follow-up). */
const preferencesStore = new Map<string, UserPreferences>();

let store: HubBrandSettingsAdapter | null = null;

export function getHubBrandSettingsStore(): HubBrandSettingsAdapter {
  if (!store) {
    store =
      hubSettingsDbBackend() === "postgres"
        ? new DrizzleHubBrandSettingsAdapter()
        : memoryHubBrandSettingsAdapter;
  }
  return store;
}

/** @internal test helper — force a specific adapter (or clear singleton). */
export function setHubBrandSettingsStoreForTests(
  next: HubBrandSettingsAdapter | null,
): void {
  store = next;
}

export async function getLocalBrandKit(
  unionId: string,
  localId: string,
): Promise<BrandKit | null> {
  return getHubBrandSettingsStore().getLocalBrandKit(unionId, localId);
}

export async function saveLocalBrandKit(
  unionId: string,
  localId: string,
  kit: BrandKit,
  updatedBy = "system",
): Promise<BrandKit> {
  return getHubBrandSettingsStore().saveLocalBrandKit(
    unionId,
    localId,
    kit,
    updatedBy,
  );
}

export async function getPersonalBrandRecord(
  userId: string,
  unionId?: string,
): Promise<{ overlay: BrandKitPatch; onboardingComplete: boolean }> {
  return getHubBrandSettingsStore().getPersonalBrandRecord(userId, unionId);
}

export async function savePersonalBrandRecord(
  userId: string,
  unionId: string | undefined,
  patch: {
    overlay?: BrandKitPatch;
    onboardingComplete?: boolean;
  },
): Promise<{ overlay: BrandKitPatch; onboardingComplete: boolean }> {
  return getHubBrandSettingsStore().savePersonalBrandRecord(
    userId,
    unionId,
    patch,
  );
}

/** Legacy helper — personal-only effective when no local. */
export async function getHubBrandKitRecord(
  key: string,
): Promise<HubBrandKitRecord> {
  const [unionId, userId] = key.includes(":")
    ? (key.split(":") as [string, string])
    : ["solo", key];
  const personal = await getPersonalBrandRecord(
    userId,
    unionId === "solo" ? undefined : unionId,
  );
  const effective = resolveEffectiveBrandKit(null, personal.overlay);
  return {
    brandKit: effective,
    onboardingComplete: personal.onboardingComplete,
  };
}

/** Legacy helper — writes a personal full-kit overlay. */
export async function saveHubBrandKitRecord(
  key: string,
  patch: Partial<HubBrandKitRecord>,
): Promise<HubBrandKitRecord> {
  const [unionIdRaw, userId] = key.includes(":")
    ? (key.split(":") as [string, string])
    : ["solo", key];
  const unionId = unionIdRaw === "solo" ? undefined : unionIdRaw;
  const existing = await getPersonalBrandRecord(userId, unionId);
  const overlay =
    patch.brandKit === undefined
      ? existing.overlay
      : patch.brandKit
        ? ({ ...patch.brandKit } as BrandKitPatch)
        : {};
  const next = await savePersonalBrandRecord(userId, unionId, {
    overlay,
    onboardingComplete: patch.onboardingComplete,
  });
  return {
    brandKit: resolveEffectiveBrandKit(null, next.overlay),
    onboardingComplete: next.onboardingComplete,
  };
}

export function seedKitFromUnion(ctx: ResolveBrandContext): BrandKit {
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
 * When Local has no published row, returns an ephemeral union seed without writing.
 */
export async function resolveHubBrandKit(
  ctx: ResolveBrandContext,
): Promise<HubBrandKitRecord> {
  const { userId, unionId, localId, roles } = ctx;
  const adapter = getHubBrandSettingsStore();
  const personal = await adapter.getPersonalBrandRecord(userId, unionId);
  let localShared: BrandKit | null = null;
  let hasLocalShared = false;

  if (unionId && localId) {
    localShared = await adapter.getLocalBrandKit(unionId, localId);
    hasLocalShared = Boolean(localShared);
    if (!localShared) {
      // Ephemeral seed for chrome — do not persist until an officer publishes.
      localShared = seedKitFromUnion(ctx);
    }
  }

  const effective = resolveEffectiveBrandKit(localShared, personal.overlay);
  return {
    brandKit: effective,
    onboardingComplete: personal.onboardingComplete,
    source: {
      hasLocalShared,
      hasPersonalOverlay: overlayHasContent(personal.overlay),
      canPublishLocal: canPublishLocalBrand(roles),
    },
  };
}

export async function writeHubBrandKit(
  ctx: ResolveBrandContext,
  input: {
    scope: BrandKitWriteScope;
    brandKit?: BrandKit | null;
    onboardingComplete?: boolean;
  },
): Promise<HubBrandKitRecord> {
  const { userId, unionId, localId, roles } = ctx;
  const adapter = getHubBrandSettingsStore();

  if (input.onboardingComplete !== undefined) {
    await adapter.savePersonalBrandRecord(userId, unionId, {
      onboardingComplete: input.onboardingComplete,
    });
  }

  if (input.brandKit !== undefined) {
    if (input.brandKit === null) {
      if (input.scope === "local") {
        if (!canPublishLocalBrand(roles) || !unionId || !localId) {
          throw new Error("forbidden_local_write");
        }
        await adapter.deleteLocalBrandKit(unionId, localId);
      } else {
        await adapter.savePersonalBrandRecord(userId, unionId, {
          overlay: {},
        });
      }
    } else if (input.scope === "local") {
      if (!canPublishLocalBrand(roles) || !unionId || !localId) {
        throw new Error("forbidden_local_write");
      }
      const saved = await adapter.saveLocalBrandKit(
        unionId,
        localId,
        input.brandKit,
        userId,
      );
      const personal = await adapter.getPersonalBrandRecord(userId, unionId);
      await adapter.savePersonalBrandRecord(userId, unionId, {
        overlay: pruneOverlayAgainstLocal(saved, personal.overlay),
      });
    } else {
      const localShared =
        unionId && localId
          ? await adapter.getLocalBrandKit(unionId, localId)
          : null;
      const overlay = computePersonalOverlay(localShared, input.brandKit);
      await adapter.savePersonalBrandRecord(userId, unionId, { overlay });
    }
  }

  return resolveHubBrandKit(ctx);
}

export async function clearPersonalBrandKit(
  ctx: ResolveBrandContext,
): Promise<HubBrandKitRecord> {
  await getHubBrandSettingsStore().savePersonalBrandRecord(
    ctx.userId,
    ctx.unionId,
    { overlay: {} },
  );
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
  memoryHubBrandSettingsAdapter.resetForTests();
  preferencesStore.clear();
  store = null;
}
