"use client";

import { useSession } from "next-auth/react";
import { usePreferencesStore } from "@/store/preferences-store";
import { isStewardRole } from "@/lib/qol/access";
import type { UserRole } from "@/types/tenant";

/**
 * Mobile steward read-only mode:
 * - Steward role + preference enabled → hide write actions in UI
 * - Server still enforces canEditGrievance for assigned cases
 */
export function useStewardReadOnly(): {
  readOnly: boolean;
  isSteward: boolean;
  mobileMode: boolean;
} {
  const { data: session } = useSession();
  const mobileMode = usePreferencesStore((s) => s.preferences.stewardMobileMode);
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const isSteward = isStewardRole(roles);
  const readOnly = isSteward && mobileMode;
  return { readOnly, isSteward, mobileMode };
}
