import type { EncryptedHybridFile, HybridLocalSliceMeta } from "./types";

export const HYBRID_LOCAL_SLICE_KEY = "lunion-hybrid-local-slice";
export const HYBRID_MODE_KEY = "lunion-hybrid-mode";

export type HybridDataMode = "central" | "local";

export interface HybridLocalSliceAdapter {
  getEncryptedSlice(): Promise<EncryptedHybridFile | null>;
  saveEncryptedSlice(file: EncryptedHybridFile): Promise<void>;
  clearEncryptedSlice(): Promise<void>;
  getMeta(): Promise<HybridLocalSliceMeta | null>;
  getDataMode(): Promise<HybridDataMode>;
  setDataMode(mode: HybridDataMode): Promise<void>;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export class LocalHybridSliceAdapter implements HybridLocalSliceAdapter {
  async getEncryptedSlice(): Promise<EncryptedHybridFile | null> {
    return readJson<EncryptedHybridFile>(HYBRID_LOCAL_SLICE_KEY);
  }

  async saveEncryptedSlice(file: EncryptedHybridFile): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(HYBRID_LOCAL_SLICE_KEY, JSON.stringify(file));
  }

  async clearEncryptedSlice(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(HYBRID_LOCAL_SLICE_KEY);
  }

  async getMeta(): Promise<HybridLocalSliceMeta | null> {
    const file = await this.getEncryptedSlice();
    if (!file) return null;
    return {
      unionId: file.unionId,
      localId: file.localId,
      savedAt: file.exportedAt,
      grievanceCount: -1,
      bumpingCount: -1,
    };
  }

  async getDataMode(): Promise<HybridDataMode> {
    if (typeof window === "undefined") return "central";
    const mode = localStorage.getItem(HYBRID_MODE_KEY);
    return mode === "local" ? "local" : "central";
  }

  async setDataMode(mode: HybridDataMode): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(HYBRID_MODE_KEY, mode);
  }
}

export const hybridLocalSliceAdapter: HybridLocalSliceAdapter =
  new LocalHybridSliceAdapter();
