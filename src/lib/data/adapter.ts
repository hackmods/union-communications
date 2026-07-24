import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";

export interface DataAdapter {
  getBrandKit(): Promise<BrandKit | null>;
  saveBrandKit(kit: BrandKit): Promise<void>;
  clearBrandKit(): Promise<void>;
  isOnboardingComplete(): Promise<boolean>;
  setOnboardingComplete(complete: boolean): Promise<void>;
  getUserPreferences(): Promise<UserPreferences | null>;
  saveUserPreferences(prefs: UserPreferences): Promise<void>;
}

/**
 * Storage backend selector persisted client-side. `local` (default) keeps
 * Comms data sovereign on-device (ADR-006); `api` opts an authenticated Hub
 * user into server-persisted Brand Kit + preferences via `ApiAdapter`. This
 * is a per-browser preference, not a global feature flag — never default a
 * whole tenant to `api` without explicit user opt-in.
 */
export type DataAdapterMode = "local" | "api";
export const DATA_ADAPTER_MODE_KEY = "unionops-data-adapter-mode";

export function resolveDataAdapterMode(
  raw: string | null | undefined,
): DataAdapterMode {
  return raw === "api" ? "api" : "local";
}

/** Canonical Brand Kit storage key (TOOL-007). */
export const BRAND_KIT_KEY = "unionops-brand-kit";
/** Canonical onboarding flag key (TOOL-007). */
export const ONBOARDING_KEY = "unionops-onboarding-complete";
export const USER_PREFERENCES_KEY = "lunion-user-preferences";

/** Pre-rebrand keys — read once and migrate to the canonical names. */
export const LEGACY_BRAND_KIT_KEY = "opseu-brand-kit";
export const LEGACY_ONBOARDING_KEY = "opseu-onboarding-complete";
