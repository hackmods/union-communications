import type { BrandKit, BrandKitPatch } from "@/types/entities";

export type PersonalBrandRecord = {
  overlay: BrandKitPatch;
  onboardingComplete: boolean;
};

/**
 * Low-level persistence for Hub Local shared kits + personal overlays.
 * Preferences stay memory-only in `store.ts` (separate follow-up).
 */
export interface HubBrandSettingsAdapter {
  getLocalBrandKit(
    unionId: string,
    localId: string,
  ): Promise<BrandKit | null>;
  saveLocalBrandKit(
    unionId: string,
    localId: string,
    kit: BrandKit,
    updatedBy: string,
  ): Promise<BrandKit>;
  deleteLocalBrandKit(unionId: string, localId: string): Promise<void>;
  getPersonalBrandRecord(
    userId: string,
    unionId?: string,
  ): Promise<PersonalBrandRecord>;
  savePersonalBrandRecord(
    userId: string,
    unionId: string | undefined,
    patch: {
      overlay?: BrandKitPatch;
      onboardingComplete?: boolean;
    },
  ): Promise<PersonalBrandRecord>;
  resetForTests(): void;
}
