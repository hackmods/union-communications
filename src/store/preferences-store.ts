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
  setStewardMobileMode: (stewardMobileMode: boolean) => void;
  setPreferences: (partial: Partial<UserPreferences>) => void;
  hydrate: () => Promise<void>;
}

function persistAndApply(prefs: UserPreferences) {
  applyPreferencesToDocument(prefs);
  void dataAdapter.saveUserPreferences(prefs);
}

/** Drop retired fields (e.g. officerLearningColour) from stored prefs. */
function normalizePreferences(
  stored: Partial<UserPreferences> | null | undefined,
): UserPreferences {
  const {
    fontSize,
    highContrast,
    reducedMotion,
    stewardMobileMode,
  } = { ...DEFAULT_USER_PREFERENCES, ...(stored ?? {}) };
  return { fontSize, highContrast, reducedMotion, stewardMobileMode };
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

  setStewardMobileMode: (stewardMobileMode) => {
    const updated = { ...get().preferences, stewardMobileMode };
    set({ preferences: updated });
    persistAndApply(updated);
  },

  setPreferences: (partial) => {
    const updated = normalizePreferences({ ...get().preferences, ...partial });
    set({ preferences: updated });
    persistAndApply(updated);
  },

  hydrate: async () => {
    const stored = await dataAdapter.getUserPreferences();
    const preferences = normalizePreferences(stored);
    set({ preferences, hydrated: true });
    applyPreferencesToDocument(preferences);
  },
}));
