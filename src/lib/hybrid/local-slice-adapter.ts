import type { EncryptedHybridFile, HybridLocalSliceMeta } from "./types";
import {
  clearLiveHybridSession,
  isLiveHybridUnlocked,
} from "./live-session";

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
  /** True when preferred mode is local and a decrypted tab session is unlocked. */
  isLiveLocalActive(): Promise<boolean>;
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readJson<T>(key: string): T | null {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private browsing / quota — caller surfaces via missing slice
  }
}

function removeKey(key: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export class LocalHybridSliceAdapter implements HybridLocalSliceAdapter {
  async getEncryptedSlice(): Promise<EncryptedHybridFile | null> {
    return readJson<EncryptedHybridFile>(HYBRID_LOCAL_SLICE_KEY);
  }

  async saveEncryptedSlice(file: EncryptedHybridFile): Promise<void> {
    writeJson(HYBRID_LOCAL_SLICE_KEY, file);
  }

  async clearEncryptedSlice(): Promise<void> {
    removeKey(HYBRID_LOCAL_SLICE_KEY);
    clearLiveHybridSession();
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
    if (!storageAvailable()) return "central";
    try {
      const mode = localStorage.getItem(HYBRID_MODE_KEY);
      return mode === "local" ? "local" : "central";
    } catch {
      return "central";
    }
  }

  async setDataMode(mode: HybridDataMode): Promise<void> {
    if (!storageAvailable()) return;
    try {
      localStorage.setItem(HYBRID_MODE_KEY, mode);
    } catch {
      return;
    }
    if (mode === "central") {
      clearLiveHybridSession();
    }
  }

  async isLiveLocalActive(): Promise<boolean> {
    const mode = await this.getDataMode();
    return mode === "local" && isLiveHybridUnlocked();
  }
}

export const hybridLocalSliceAdapter: HybridLocalSliceAdapter =
  new LocalHybridSliceAdapter();
