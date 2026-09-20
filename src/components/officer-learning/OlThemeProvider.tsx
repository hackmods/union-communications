"use client";

import { createContext, useContext, type ReactNode } from "react";
import { olTheme, type OlTheme } from "@/lib/officer-learning/theme";

const OlThemeContext = createContext<OlTheme>(olTheme);

export function OlThemeProvider({ children }: { children: ReactNode }) {
  return (
    <OlThemeContext.Provider value={olTheme}>{children}</OlThemeContext.Provider>
  );
}

export function useOlTheme(): OlTheme {
  return useContext(OlThemeContext);
}
