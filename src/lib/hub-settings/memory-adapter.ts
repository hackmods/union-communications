import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { BrandKit, BrandKitPatch } from "@/types/entities";
import type {
  HubBrandSettingsAdapter,
  PersonalBrandRecord,
} from "./adapter";
import { localBrandKey, personalBrandKey } from "./keys";

const localBrandStore = new Map<string, BrandKit>();
const personalOverlayStore = new Map<string, PersonalBrandRecord>();

export class MemoryHubBrandSettingsAdapter implements HubBrandSettingsAdapter {
  async getLocalBrandKit(
    unionId: string,
    localId: string,
  ): Promise<BrandKit | null> {
    return localBrandStore.get(localBrandKey(unionId, localId)) ?? null;
  }

  async saveLocalBrandKit(
    unionId: string,
    localId: string,
    kit: BrandKit,
    _updatedBy: string,
  ): Promise<BrandKit> {
    const next = normalizeBrandKit({
      ...kit,
      updatedAt: new Date().toISOString(),
    });
    localBrandStore.set(localBrandKey(unionId, localId), next);
    return next;
  }

  async deleteLocalBrandKit(unionId: string, localId: string): Promise<void> {
    localBrandStore.delete(localBrandKey(unionId, localId));
  }

  async getPersonalBrandRecord(
    userId: string,
    unionId?: string,
  ): Promise<PersonalBrandRecord> {
    return (
      personalOverlayStore.get(personalBrandKey(userId, unionId)) ?? {
        overlay: {},
        onboardingComplete: false,
      }
    );
  }

  async savePersonalBrandRecord(
    userId: string,
    unionId: string | undefined,
    patch: {
      overlay?: BrandKitPatch;
      onboardingComplete?: boolean;
    },
  ): Promise<PersonalBrandRecord> {
    const key = personalBrandKey(userId, unionId);
    const existing = await this.getPersonalBrandRecord(userId, unionId);
    const next: PersonalBrandRecord = {
      overlay: patch.overlay !== undefined ? patch.overlay : existing.overlay,
      onboardingComplete:
        patch.onboardingComplete !== undefined
          ? patch.onboardingComplete
          : existing.onboardingComplete,
    };
    personalOverlayStore.set(key, next);
    return next;
  }

  resetForTests(): void {
    localBrandStore.clear();
    personalOverlayStore.clear();
  }
}

export const memoryHubBrandSettingsAdapter = new MemoryHubBrandSettingsAdapter();
