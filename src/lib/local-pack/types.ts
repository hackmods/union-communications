import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";
import type { PublicRoster } from "@/types/public-roster";
import type { WebsiteDraft } from "@/types/website-draft";

export const LOCAL_PACK_KIND = "unionops-local-pack" as const;
export const LOCAL_PACK_VERSION = 1 as const;
export const LOCAL_PACK_FILE_SUFFIX = "local-pack.json";

/** Current on-disk / download envelope after migration. */
export interface LocalPackV1 {
  kind: typeof LOCAL_PACK_KIND;
  version: typeof LOCAL_PACK_VERSION;
  exportedAt: string;
  brandKit?: BrandKit;
  publicRoster?: PublicRoster;
  preferences?: UserPreferences;
  onboardingComplete?: boolean;
  websiteDraft?: WebsiteDraft;
}

export type LocalPack = LocalPackV1;

export type LocalPackParseCode =
  | "invalidJson"
  | "wrongKind"
  | "unsupportedVersion"
  | "invalidSection"
  | "empty";

export type LocalPackParseResult =
  | { ok: true; pack: LocalPack }
  | { ok: false; code: LocalPackParseCode; detail?: string };

export function localPackFilename(localNumber: string): string {
  const safe = localNumber.replace(/[^\w.-]+/g, "-") || "local";
  return `local-${safe}-${LOCAL_PACK_FILE_SUFFIX}`;
}
