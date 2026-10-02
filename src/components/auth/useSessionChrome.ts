"use client";

import { useSession } from "next-auth/react";

/**
 * Session rule for sticky chrome (public header + Hub).
 *
 * NextAuth sets `status === "loading"` during `session.update()` while
 * `session.user` often remains. Bare `status === "authenticated"` checks
 * blank the nav mid-refresh; keep chrome when a user is still known.
 */
export function useSessionChrome() {
  const { data: session, status, update } = useSession();
  const authenticated =
    Boolean(session?.user) && status !== "unauthenticated";
  const coldLoading = status === "loading" && !session?.user;
  return { session, status, update, authenticated, coldLoading };
}
