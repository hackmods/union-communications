"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useBrandStore } from "@/store/brand-store";
import {
  getDataAdapter,
  setDataAdapterMode,
} from "@/lib/data/get-data-adapter";

/**
 * Authenticated Brand Kit sync: switch to ApiAdapter and rehydrate when
 * Hub tenancy changes. Server owns empty-Local seed; never overwrites silently
 * beyond hydrate from `/api/brand-kit`.
 */
export function HubBrandKitSync() {
  const { data: session, status } = useSession();
  const hydrate = useBrandStore((s) => s.hydrate);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated" || !session?.user?.id) {
      if (lastKey.current !== "local") {
        setDataAdapterMode("local");
        lastKey.current = "local";
        void hydrate();
      }
      return;
    }

    const key = [
      session.user.id,
      session.user.unionId ?? "",
      session.user.localId ?? "",
      // sessionVersion may live on token; optional refresh signal
      (session.user as { sessionVersion?: number }).sessionVersion ?? "",
    ].join(":");

    if (lastKey.current === key) return;
    lastKey.current = key;
    setDataAdapterMode("api");
    // Ensure adapter resolution sees the new mode before hydrate.
    void getDataAdapter();
    void hydrate();
  }, [
    status,
    session?.user?.id,
    session?.user?.unionId,
    session?.user?.localId,
    (session?.user as { sessionVersion?: number } | undefined)?.sessionVersion,
    hydrate,
  ]);

  return null;
}

/** @deprecated Use HubBrandKitSync — kept as alias for existing imports. */
export { HubBrandKitSync as HubBrandKitSeed };
