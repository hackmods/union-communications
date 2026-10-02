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
  // Auth.js types `loading` without `user`; use session presence so JWT
  // refresh (status loading, prior session kept) is not treated as cold start.
  const coldLoading = status === "loading" && !session;
  return { session, status, update, authenticated, coldLoading };
}
