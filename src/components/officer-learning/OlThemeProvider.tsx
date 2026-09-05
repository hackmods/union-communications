"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePreferencesStore } from "@/store/preferences-store";
import {
  resolveOfficerLearningColour,
  type OfficerLearningColour,
} from "@/types/preferences";
import {
  getOlTheme,
  olThemeNavy,
  type OlTheme,
} from "@/lib/officer-learning/theme";

type OlThemeContextValue = {
  colour: OfficerLearningColour;
  theme: OlTheme;
};

const DEFAULT_VALUE: OlThemeContextValue = {
  colour: "navy",
  theme: olThemeNavy,
};

const OlThemeContext = createContext<OlThemeContextValue>(DEFAULT_VALUE);

function readDomColour(): OfficerLearningColour {
  if (typeof document === "undefined") return "navy";
  return resolveOfficerLearningColour(
    document.documentElement.getAttribute("data-ol-colour"),
  );
}

function subscribeOlColour(onStoreChange: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-ol-colour"],
  });
  return () => observer.disconnect();
}

export function OlThemeProvider({ children }: { children: ReactNode }) {
  const hydrated = usePreferencesStore((s) => s.hydrated);
  const stored = usePreferencesStore((s) => s.preferences.officerLearningColour);
  const domColour = useSyncExternalStore(
    subscribeOlColour,
    readDomColour,
    () => "navy" as const,
  );
  const colour = hydrated ? stored : domColour;
  const value = useMemo(
    () => ({ colour, theme: getOlTheme(colour) }),
    [colour],
  );

  return (
    <OlThemeContext.Provider value={value}>{children}</OlThemeContext.Provider>
  );
}

export function useOlTheme(): OlTheme {
  return useContext(OlThemeContext).theme;
}

export function useOlColour(): OfficerLearningColour {
  return useContext(OlThemeContext).colour;
}
