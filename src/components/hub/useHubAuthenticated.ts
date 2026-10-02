"use client";

import { useSessionChrome } from "@/components/auth/useSessionChrome";

/**
 * Hub chrome should stay mounted while NextAuth refreshes the JWT
 * (e.g. HubContextSwitcher collection change). Bare `status === "authenticated"`
 * checks unmount the nav drawer mid-update on mobile.
 *
 * Shared definition: {@link useSessionChrome}.
 */
export function useHubAuthenticated() {
  const { session, status, update, authenticated } = useSessionChrome();
  return { session, status, update, authenticated };
}
