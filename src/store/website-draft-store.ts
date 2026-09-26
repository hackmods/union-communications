"use client";

import { create } from "zustand";
import { dataAdapter } from "@/lib/data/local-storage-adapter";
import { stampWebsiteDraft } from "@/lib/local-pack/website-draft";
import {
  emptyWebsiteDraft,
  type WebsiteDraft,
} from "@/types/website-draft";

interface WebsiteDraftState {
  draft: WebsiteDraft;
  hydrated: boolean;
  setDraft: (partial: Partial<Omit<WebsiteDraft, "version" | "updatedAt">>) => void;
  replaceDraft: (draft: WebsiteDraft) => void;
  resetDraft: () => void;
  hydrate: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(draft: WebsiteDraft) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void dataAdapter.saveWebsiteDraft(draft);
  }, 400);
}

export const useWebsiteDraftStore = create<WebsiteDraftState>()((set, get) => ({
  draft: emptyWebsiteDraft(),
  hydrated: false,

  setDraft: (partial) => {
    const draft = stampWebsiteDraft({
      ...get().draft,
      ...partial,
    });
    set({ draft });
    scheduleSave(draft);
  },

  replaceDraft: (incoming) => {
    const draft = stampWebsiteDraft({
      unionName: incoming.unionName,
      heroText: incoming.heroText,
      about1: incoming.about1,
      about2: incoming.about2,
      contactEmail: incoming.contactEmail,
      officeAddress: incoming.officeAddress,
      contactPhone: incoming.contactPhone ?? "",
      officeHours: incoming.officeHours ?? "",
      ctaLabel: incoming.ctaLabel ?? "",
      layoutId: incoming.layoutId,
      siteLocale: incoming.siteLocale,
      includePrivacyPage: incoming.includePrivacyPage ?? true,
      includeSiteQr: incoming.includeSiteQr ?? false,
      events: incoming.events ?? [],
      facebookUrl: incoming.facebookUrl ?? null,
      officersOverride: incoming.officersOverride,
      officers: incoming.officers,
      heroArtId: incoming.heroArtId,
      heroImageAlt: incoming.heroImageAlt,
    });
    set({ draft });
    void dataAdapter.saveWebsiteDraft(draft);
  },

  resetDraft: () => {
    const draft = stampWebsiteDraft({
      ...emptyWebsiteDraft(),
    });
    set({ draft });
    void dataAdapter.saveWebsiteDraft(draft);
  },

  hydrate: async () => {
    if (get().hydrated) return;
    const stored = await dataAdapter.getWebsiteDraft();
    set({
      draft: stored ?? get().draft,
      hydrated: true,
    });
  },
}));
