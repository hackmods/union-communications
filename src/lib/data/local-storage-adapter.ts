import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";
import {
  BRAND_KIT_KEY,
  LEGACY_BRAND_KIT_KEY,
  LEGACY_ONBOARDING_KEY,
  ONBOARDING_KEY,
  USER_PREFERENCES_KEY,
  type DataAdapter,
} from "./adapter";
import { normalizeBrandKit } from "@/lib/utils/local-links";

type PersistenceListener = (blocked: boolean) => void;

/**
 * Browser DataAdapter with try/catch around every localStorage call (TOOL-001),
 * in-memory session fallback, Brand Kit v2 write-back (TOOL-006), and legacy
 * `opseu-*` key migration (TOOL-007).
 */
export class LocalStorageAdapter implements DataAdapter {
  /**
   * Session-only mirror so failed persists still round-trip within the tab.
   * `null` is a tombstone: clear succeeded in-session even if removeItem threw.
   */
  private readonly memory = new Map<string, string | null>();
  private persistenceBlocked = false;
  private readonly listeners = new Set<PersistenceListener>();

  isPersistenceBlocked(): boolean {
    return this.persistenceBlocked;
  }

  dismissPersistenceBlocked(): void {
    this.persistenceBlocked = false;
    this.notifyListeners(false);
  }

  subscribePersistenceBlocked(listener: PersistenceListener): () => void {
    this.listeners.add(listener);
    listener(this.persistenceBlocked);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Test helper — clear session cache and persistence flag. */
  resetForTests(): void {
    this.memory.clear();
    this.persistenceBlocked = false;
    this.listeners.clear();
  }

  async getBrandKit(): Promise<BrandKit | null> {
    if (typeof window === "undefined") return null;

    let raw = this.safeGet(BRAND_KIT_KEY);
    let fromLegacy = false;
    if (raw === null) {
      raw = this.safeGet(LEGACY_BRAND_KIT_KEY);
      fromLegacy = raw !== null;
    }
    if (raw === null) return null;

    try {
      const parsed = JSON.parse(raw) as { version?: string };
      const normalized = normalizeBrandKit(parsed);
      const needsWriteBack = fromLegacy || parsed.version !== "2.0";
      if (needsWriteBack) {
        this.safeSet(BRAND_KIT_KEY, JSON.stringify(normalized));
        if (fromLegacy) {
          this.safeRemove(LEGACY_BRAND_KIT_KEY);
        }
      }
      return normalized;
    } catch {
      return null;
    }
  }

  async saveBrandKit(kit: BrandKit): Promise<void> {
    if (typeof window === "undefined") return;
    this.safeSet(BRAND_KIT_KEY, JSON.stringify(normalizeBrandKit(kit)));
    // Drop legacy key once the canonical key has a write attempt.
    this.safeRemove(LEGACY_BRAND_KIT_KEY);
  }

  async clearBrandKit(): Promise<void> {
    if (typeof window === "undefined") return;
    this.safeRemove(BRAND_KIT_KEY);
    this.safeRemove(LEGACY_BRAND_KIT_KEY);
  }

  async isOnboardingComplete(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    let raw = this.safeGet(ONBOARDING_KEY);
    if (raw === null) {
      const legacy = this.safeGet(LEGACY_ONBOARDING_KEY);
      if (legacy !== null) {
        this.safeSet(ONBOARDING_KEY, legacy);
        this.safeRemove(LEGACY_ONBOARDING_KEY);
        raw = legacy;
      }
    }
    return raw === "true";
  }

  async setOnboardingComplete(complete: boolean): Promise<void> {
    if (typeof window === "undefined") return;
    this.safeSet(ONBOARDING_KEY, complete ? "true" : "false");
    this.safeRemove(LEGACY_ONBOARDING_KEY);
  }

  async getUserPreferences(): Promise<UserPreferences | null> {
    if (typeof window === "undefined") return null;
    const raw = this.safeGet(USER_PREFERENCES_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserPreferences;
    } catch {
      return null;
    }
  }

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    if (typeof window === "undefined") return;
    this.safeSet(USER_PREFERENCES_KEY, JSON.stringify(prefs));
  }

  private safeGet(key: string): string | null {
    if (this.memory.has(key) && this.memory.get(key) === null) {
      return null;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        this.memory.set(key, raw);
        return raw;
      }
    } catch (err) {
      console.warn("[LocalStorageAdapter] getItem failed", key, err);
    }
    const cached = this.memory.get(key);
    return cached === undefined || cached === null ? null : cached;
  }

  private safeSet(key: string, value: string): boolean {
    this.memory.set(key, value);
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn("[LocalStorageAdapter] setItem failed", key, err);
      this.markPersistenceBlocked();
      return false;
    }
  }

  private safeRemove(key: string): boolean {
    this.memory.set(key, null);
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn("[LocalStorageAdapter] removeItem failed", key, err);
      this.markPersistenceBlocked();
      return false;
    }
  }

  private markPersistenceBlocked(): void {
    if (this.persistenceBlocked) return;
    this.persistenceBlocked = true;
    this.notifyListeners(true);
  }

  private notifyListeners(blocked: boolean): void {
    for (const listener of this.listeners) {
      listener(blocked);
    }
  }
}

export const dataAdapter = new LocalStorageAdapter();
