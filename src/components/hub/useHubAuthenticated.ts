"use client";

import { useSession } from "next-auth/react";

/**
 * Hub chrome should stay mounted while NextAuth refreshes the JWT
 * (e.g. HubContextSwitcher collection change). Bare `status === "authenticated"`
 * checks unmount the nav drawer mid-update on mobile.
 */
export function useHubAuthenticated() {
  const { data: session, status, update } = useSession();
  const authenticated =
    Boolean(session?.user) && status !== "unauthenticated";
  return { session, status, update, authenticated };
}
