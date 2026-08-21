"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { getTenantContext, withActiveLocal } from "@/lib/tenant/loader";
import type { TenantContext } from "@/types/tenant";

const TenantLiveContext = createContext<TenantContext | null>(null);

/** Live tenant from GET /api/tenant (overlay locals), else seed + session local. */
export function useLiveTenant(): TenantContext | null {
  return useContext(TenantLiveContext);
}

export function TenantLiveProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const mfaOk = useSessionMfaOk();
  const unionId = session?.user?.unionId;
  const localId = session?.user?.localId;
  const seed = unionId ? getTenantContext(unionId, localId) : null;
  const [fetched, setFetched] = useState<{
    unionId: string;
    context: TenantContext;
  } | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !mfaOk || !unionId) return;
    const activeUnionId = unionId;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/tenant");
        if (!res.ok) return;
        const data = (await res.json()) as { context: TenantContext };
        if (!cancelled) {
          setFetched({ unionId: activeUnionId, context: data.context });
        }
      } catch {
        /* Keep seed until a later retry (tenant-updated). */
      }
    }

    const onUpdate = () => {
      void load();
    };

    void load();
    window.addEventListener("unionops:tenant-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("unionops:tenant-updated", onUpdate);
    };
  }, [status, mfaOk, unionId]);

  const live =
    fetched && fetched.unionId === unionId
      ? withActiveLocal(fetched.context, localId)
      : null;

  return (
    <TenantLiveContext.Provider value={live ?? seed}>
      {children}
    </TenantLiveContext.Provider>
  );
}
