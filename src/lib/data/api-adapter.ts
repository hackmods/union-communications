import type { BrandKit } from "@/types/entities";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { UserPreferences } from "@/types/preferences";
import type { DataAdapter } from "./adapter";
import { mirrorBrandKitToLocalStorage } from "./mirror-brand-kit";

export type BrandKitSaveScope = "personal" | "local";

export type BrandKitSyncSource = {
  hasLocalShared: boolean;
  hasPersonalOverlay: boolean;
  canPublishLocal: boolean;
};

type BrandKitApiRecord = {
  brandKit: BrandKit | null;
  onboardingComplete?: boolean;
  source?: BrandKitSyncSource;
};

/**
 * Authenticated `DataAdapter` backed by `/api/brand-kit` and `/api/preferences`.
 * Default save scope is personal overlay; use `publishLocalBrandKit` to
 * publish Local shared defaults (requires officer role server-side).
 * Successful Hub kits are mirrored to localStorage for FOUC / logout continuity.
 */
export class ApiAdapter implements DataAdapter {
  private saveScope: BrandKitSaveScope = "personal";
  /** Last GET `/api/brand-kit` source metadata (hybrid Local + personal). */
  lastSyncSource: BrandKitSyncSource | null = null;

  setSaveScope(scope: BrandKitSaveScope): void {
    this.saveScope = scope;
  }

  async getBrandKit(): Promise<BrandKit | null> {
    try {
      const res = await this.fetchJson<BrandKitApiRecord>("/api/brand-kit");
      this.lastSyncSource = res?.source ?? null;
      const kit = res?.brandKit ?? null;
      const normalized = kit ? normalizeBrandKit(kit) : null;
      if (normalized) {
        await mirrorBrandKitToLocalStorage(normalized);
      }
      return normalized;
    } catch (err) {
      console.warn("[ApiAdapter] getBrandKit failed", err);
      this.lastSyncSource = null;
      return null;
    }
  }

  async saveBrandKit(kit: BrandKit): Promise<void> {
    await this.trySaveBrandKit(kit);
  }

  /**
   * Persist personal (or current save-scope) kit; returns false on network/API failure.
   * Used by login browser→personal promotion so the UI can recover.
   */
  async trySaveBrandKit(kit: BrandKit): Promise<boolean> {
    try {
      const res = await this.putJsonRecord("/api/brand-kit", {
        brandKit: normalizeBrandKit(kit),
        scope: this.saveScope,
      });
      if (!res) return false;
      if (res.source) this.lastSyncSource = res.source;
      const effective = res.brandKit
        ? normalizeBrandKit(res.brandKit)
        : normalizeBrandKit(kit);
      await mirrorBrandKitToLocalStorage(effective);
      return true;
    } catch (err) {
      console.warn("[ApiAdapter] saveBrandKit failed", err);
      return false;
    }
  }

  async publishLocalBrandKit(kit: BrandKit): Promise<boolean> {
    try {
      const res = await fetch("/api/brand-kit", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandKit: normalizeBrandKit(kit),
          scope: "local",
        }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as BrandKitApiRecord;
      this.lastSyncSource = data.source ?? {
        hasLocalShared: true,
        hasPersonalOverlay: false,
        canPublishLocal: true,
      };
      const effective = data.brandKit
        ? normalizeBrandKit(data.brandKit)
        : normalizeBrandKit(kit);
      await mirrorBrandKitToLocalStorage(effective);
      return true;
    } catch (err) {
      console.warn("[ApiAdapter] publishLocalBrandKit failed", err);
      return false;
    }
  }

  async clearBrandKit(): Promise<void> {
    try {
      await fetch("/api/brand-kit", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (err) {
      console.warn("[ApiAdapter] clearBrandKit failed", err);
    }
  }

  async isOnboardingComplete(): Promise<boolean> {
    try {
      const res = await this.fetchJson<{ onboardingComplete: boolean }>(
        "/api/brand-kit",
      );
      return res?.onboardingComplete ?? false;
    } catch (err) {
      console.warn("[ApiAdapter] isOnboardingComplete failed", err);
      return false;
    }
  }

  async setOnboardingComplete(complete: boolean): Promise<void> {
    try {
      await this.putJsonRecord("/api/brand-kit", {
        onboardingComplete: complete,
      });
    } catch (err) {
      console.warn("[ApiAdapter] setOnboardingComplete failed", err);
    }
  }

  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const res = await this.fetchJson<{ preferences: UserPreferences | null }>(
        "/api/preferences",
      );
      return res?.preferences ?? null;
    } catch (err) {
      console.warn("[ApiAdapter] getUserPreferences failed", err);
      return null;
    }
  }

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    try {
      await this.putJsonRecord("/api/preferences", { preferences: prefs });
    } catch (err) {
      console.warn("[ApiAdapter] saveUserPreferences failed", err);
    }
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }

  private async putJsonRecord(
    url: string,
    body: unknown,
  ): Promise<BrandKitApiRecord | null> {
    const res = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`PUT ${url} failed with ${res.status}`);
    }
    try {
      return (await res.json()) as BrandKitApiRecord;
    } catch {
      return null;
    }
  }
}

export const apiAdapter = new ApiAdapter();
