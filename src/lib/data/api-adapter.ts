import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";
import type { DataAdapter } from "./adapter";

/**
 * Authenticated `DataAdapter` backed by `/api/brand-kit` and `/api/preferences`
 * (Phase 6 ApiAdapter). Intended for the Officer Hub only — public Comms tools
 * must keep using `LocalStorageAdapter` for on-device data sovereignty
 * (ADR-006 / privacy copy). See `docs/ARCHITECTURE.md` DataAdapter table.
 *
 * Every request is same-origin `credentials: "include"` so the NextAuth
 * session cookie is sent; a 401 is treated as "no data" rather than thrown,
 * so callers don't need bespoke auth-loss handling.
 */
export class ApiAdapter implements DataAdapter {
  async getBrandKit(): Promise<BrandKit | null> {
    try {
      const res = await this.fetchJson<{ brandKit: BrandKit | null }>(
        "/api/brand-kit",
      );
      return res?.brandKit ?? null;
    } catch (err) {
      console.warn("[ApiAdapter] getBrandKit failed", err);
      return null;
    }
  }

  async saveBrandKit(kit: BrandKit): Promise<void> {
    try {
      await this.putJson("/api/brand-kit", { brandKit: kit });
    } catch (err) {
      console.warn("[ApiAdapter] saveBrandKit failed", err);
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
      await this.putJson("/api/brand-kit", { onboardingComplete: complete });
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
      await this.putJson("/api/preferences", { preferences: prefs });
    } catch (err) {
      console.warn("[ApiAdapter] saveUserPreferences failed", err);
    }
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }

  private async putJson(url: string, body: unknown): Promise<void> {
    const res = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`PUT ${url} failed with ${res.status}`);
    }
  }
}

export const apiAdapter = new ApiAdapter();
