"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  /** Server-resolved session so public chrome does not flash logged-out. */
  session?: Session | null;
}) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
