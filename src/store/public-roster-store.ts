"use client";

import { create } from "zustand";
import { dataAdapter } from "@/lib/data/local-storage-adapter";
import {
  defaultPublicRoster,
  parsePublicRosterJson,
  stampRoster,
} from "@/lib/org-chart";
import type { PublicRoster, PublicRosterPerson } from "@/types/public-roster";

interface PublicRosterState {
  roster: PublicRoster;
  hydrated: boolean;
  setPeople: (people: PublicRosterPerson[]) => void;
  importRoster: (roster: PublicRoster) => void;
  resetRoster: () => void;
  hydrate: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(roster: PublicRoster) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void dataAdapter.savePublicRoster(roster);
  }, 400);
}

export const usePublicRosterStore = create<PublicRosterState>()((set, get) => ({
  roster: defaultPublicRoster(),
  hydrated: false,

  setPeople: (people) => {
    const roster = stampRoster(people);
    set({ roster });
    scheduleSave(roster);
  },

  importRoster: (incoming) => {
    const parsed = parsePublicRosterJson(incoming);
    const roster = parsed.ok
      ? stampRoster(parsed.roster.people)
      : stampRoster(incoming.people);
    set({ roster });
    void dataAdapter.savePublicRoster(roster);
  },

  resetRoster: () => {
    const roster = stampRoster(defaultPublicRoster().people);
    set({ roster });
    void dataAdapter.savePublicRoster(roster);
  },

  hydrate: async () => {
    if (get().hydrated) return;
    const stored = await dataAdapter.getPublicRoster();
    set({
      roster: stored ?? get().roster,
      hydrated: true,
    });
  },
}));
