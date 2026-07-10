"use client";

import { create } from "zustand";
import { dataAdapter } from "@/lib/data/local-storage-adapter";
import { applyPreferencesToDocument } from "@/lib/preferences/apply-preferences";
import {
  DEFAULT_USER_PREFERENCES,
  type FontSize,
  type UserPreferences,
} from "@/types/preferences";

interface PreferencesState {
  preferences: UserPreferences;
  hydrated: boolean;
  setFontSize: (fontSize: FontSize) => void;
  setHighContrast: (highContrast: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setPreferences: (partial: Partial<UserPreferences>) => void;
  hydrate: () => Promise<void>;
}

function persistAndApply(prefs: UserPreferences) {
  applyPreferencesToDocument(prefs);
  void dataAdapter.saveUserPreferences(prefs);
}

export const usePreferencesStore = create<PreferencesState>()((set, get) => ({
  preferences: DEFAULT_USER_PREFERENCES,
  hydrated: false,

  setFontSize: (fontSize) => {
    const updated = { ...get().preferences, fontSize };
    set({ preferences: updated });
    persistAndApply(updated);
  },

  setHighContrast: (highContrast) => {
    const updated = { ...get().preferences, highContrast };
    set({ preferences: updated });
    persistAndApply(updated);
  },

  setReducedMotion: (reducedMotion) => {
    const updated = { ...get().preferences, reducedMotion };
    set({ preferences: updated });
    persistAndApply(updated);
  },

  setPreferences: (partial) => {
    const updated = { ...get().preferences, ...partial };
    set({ preferences: updated });
    persistAndApply(updated);
  },

  hydrate: async () => {
    const stored = await dataAdapter.getUserPreferences();
    const preferences = stored ?? DEFAULT_USER_PREFERENCES;
    set({ preferences, hydrated: true });
    applyPreferencesToDocument(preferences);
  },
}));
