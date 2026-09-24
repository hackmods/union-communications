import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";
import type { PublicRoster } from "@/types/public-roster";
import type { WebsiteDraft } from "@/types/website-draft";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import {
  LOCAL_PACK_KIND,
  LOCAL_PACK_VERSION,
  type LocalPack,
} from "./types";

export type LocalPackBuildInput = {
  brandKit?: BrandKit | null;
  publicRoster?: PublicRoster | null;
  preferences?: UserPreferences | null;
  onboardingComplete?: boolean;
  websiteDraft?: WebsiteDraft | null;
  exportedAt?: string;
};

export function buildLocalPack(input: LocalPackBuildInput): LocalPack {
  const pack: LocalPack = {
    kind: LOCAL_PACK_KIND,
    version: LOCAL_PACK_VERSION,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
  };
  if (input.brandKit) {
    pack.brandKit = normalizeBrandKit(input.brandKit);
  }
  if (input.publicRoster) {
    pack.publicRoster = input.publicRoster;
  }
  if (input.preferences) {
    pack.preferences = input.preferences;
  }
  if (typeof input.onboardingComplete === "boolean") {
    pack.onboardingComplete = input.onboardingComplete;
  }
  if (input.websiteDraft) {
    pack.websiteDraft = input.websiteDraft;
  }
  return pack;
}

export function serializeLocalPack(pack: LocalPack): string {
  return JSON.stringify(pack, null, 2);
}
