"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { sessionRequiresMfa } from "@/lib/auth/mfa-requirements";

const MfaEnabledContext = createContext({
  enabled: false,
  hosted: false,
  effectiveRequired: null as boolean | null,
});

/**
 * Server layout passes host MFA policy (AUTH_MFA_ENABLED).
 * Client hub chrome must match sessionMfaOk — not raw JWT mfaVerified alone.
 */
export function MfaPolicyProvider({
  mfaEnabled,
  hostedCustomerMode,
  children,
}: {
  mfaEnabled: boolean;
  hostedCustomerMode: boolean;
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const [effectiveRequirement, setEffectiveRequirement] = useState<boolean | null>(null);
  const user = session?.user;

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setEffectiveRequirement(null);
      return;
    }
    const roleRequirement = sessionRequiresMfa(user, mfaEnabled, hostedCustomerMode);
    if (!hostedCustomerMode || roleRequirement) {
      setEffectiveRequirement(roleRequirement);
      return;
    }

    // Hold privileged content until current assignments/delegations and
    // Portal Circle-admin authority have been checked by the server.
    setEffectiveRequirement(null);
    let cancelled = false;
    void fetch("/api/mfa/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { required?: boolean } | null) => {
        if (!cancelled) setEffectiveRequirement(data ? Boolean(data.required) : true);
      })
      .catch(() => {
        if (!cancelled) setEffectiveRequirement(true);
      });
    return () => {
      cancelled = true;
    };
  }, [
    hostedCustomerMode,
    mfaEnabled,
    status,
    user?.id,
    user?.localId,
    user?.sessionVersion,
    user?.mfaRequired,
    user?.mfaVerified,
    user?.roles?.join(","),
  ]);

  return (
    <MfaEnabledContext.Provider value={{
      enabled: mfaEnabled,
      hosted: hostedCustomerMode,
      effectiveRequired: effectiveRequirement,
    }}>
      {children}
    </MfaEnabledContext.Provider>
  );
}

export function useMfaEnabled(): boolean {
  return useContext(MfaEnabledContext).enabled;
}

/** Aligns with the server's resolved host profile and session MFA policy. */
export function useSessionMfaOk(): boolean {
  const {
    enabled: mfaEnabled,
    hosted: hostedCustomerMode,
    effectiveRequired,
  } = useContext(MfaEnabledContext);
  const { data: session } = useSession();
  const user = session?.user;
  if (hostedCustomerMode && user && effectiveRequirement === null) {
    return false;
  }
  const required = effectiveRequired ?? sessionRequiresMfa(user, mfaEnabled, hostedCustomerMode);
  if (!required) {
    return true;
  }
  return Boolean(user?.mfaVerified);
}
