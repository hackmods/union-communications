/**
 * In-memory Hub settings store (Brand Kit + preferences) for `ApiAdapter`.
 * Keyed by `${unionId}:${userId}` — memory-only until Postgres lands (see
 * `src/lib/db/backend.ts` for the same interim pattern used by other modules).
 */

import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";

export interface HubBrandKitRecord {
  brandKit: BrandKit | null;
  onboardingComplete: boolean;
}

const brandKitStore = new Map<string, HubBrandKitRecord>();
const preferencesStore = new Map<string, UserPreferences>();

export function hubSettingsKey(userId: string, unionId?: string): string {
  return `${unionId ?? "solo"}:${userId}`;
}

export function getHubBrandKitRecord(key: string): HubBrandKitRecord {
  return brandKitStore.get(key) ?? { brandKit: null, onboardingComplete: false };
}

export function saveHubBrandKitRecord(
  key: string,
  patch: Partial<HubBrandKitRecord>,
): HubBrandKitRecord {
  const existing = getHubBrandKitRecord(key);
  const next: HubBrandKitRecord = { ...existing, ...patch };
  brandKitStore.set(key, next);
  return next;
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
  brandKitStore.clear();
  preferencesStore.clear();
}
