"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";

const MfaEnabledContext = createContext(false);

/**
 * Server layout passes host MFA policy (AUTH_MFA_ENABLED).
 * Client hub chrome must match sessionMfaOk — not raw JWT mfaVerified alone.
 */
export function MfaPolicyProvider({
  mfaEnabled,
  children,
}: {
  mfaEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <MfaEnabledContext.Provider value={mfaEnabled}>
      {children}
    </MfaEnabledContext.Provider>
  );
}

export function useMfaEnabled(): boolean {
  return useContext(MfaEnabledContext);
}

/** Aligns with server sessionMfaOk(): MFA off → always ok. */
export function useSessionMfaOk(): boolean {
  const mfaEnabled = useMfaEnabled();
  const { data: session } = useSession();
  if (!mfaEnabled) return true;
  return Boolean(session?.user?.mfaVerified);
}
