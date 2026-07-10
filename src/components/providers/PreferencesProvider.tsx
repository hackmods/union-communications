"use client";

import { useEffect } from "react";
import { applyPreferencesToDocument } from "@/lib/preferences/apply-preferences";
import { usePreferencesStore } from "@/store/preferences-store";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const hydrate = usePreferencesStore((s) => s.hydrate);
  const preferences = usePreferencesStore((s) => s.preferences);
  const hydrated = usePreferencesStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) {
      applyPreferencesToDocument(preferences);
    }
  }, [preferences, hydrated]);

  return <>{children}</>;
}
