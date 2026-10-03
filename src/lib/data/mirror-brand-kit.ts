import type { BrandKit } from "@/types/entities";
import { dataAdapter as localStorageAdapter } from "@/lib/data/local-storage-adapter";
import { normalizeBrandKit } from "@/lib/utils/local-links";

/**
 * Mirror the effective Hub Brand Kit into `unionops-brand-kit` so FOUC chrome
 * and logout (LocalStorageAdapter) stay aligned with the signed-in kit.
 */
export async function mirrorBrandKitToLocalStorage(
  kit: BrandKit | null | undefined,
): Promise<boolean> {
  if (typeof window === "undefined" || !kit) return false;
  try {
    await localStorageAdapter.saveBrandKit(normalizeBrandKit(kit));
    return !localStorageAdapter.isPersistenceBlocked();
  } catch (err) {
    console.warn("[mirrorBrandKitToLocalStorage] failed", err);
    return false;
  }
}

/** Read the on-device Brand Kit without switching DataAdapter mode. */
export async function readBrowserBrandKit(): Promise<BrandKit | null> {
  if (typeof window === "undefined") return null;
  try {
    return await localStorageAdapter.getBrandKit();
  } catch (err) {
    console.warn("[readBrowserBrandKit] failed", err);
    return null;
  }
}
