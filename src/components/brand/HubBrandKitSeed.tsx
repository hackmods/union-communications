"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useBrandStore } from "@/store/brand-store";
import type { UnionBrandTheme } from "@/lib/brand/union-brand-theme";

/**
 * One-way Hub → Brand Kit seed for browsers with no stored kit.
 * Never overwrites an existing steward Brand Kit. Does not write Hub tenancy.
 */
export function HubBrandKitSeed() {
  const { data: session, status } = useSession();
  const hydrated = useBrandStore((s) => s.hydrated);
  const hasStoredBrandKit = useBrandStore((s) => s.hasStoredBrandKit);
  const applyUnionPresetId = useBrandStore((s) => s.applyUnionPresetId);
  const applyBrandTheme = useBrandStore((s) => s.applyBrandTheme);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (!hydrated || hasStoredBrandKit) return;
    if (status !== "authenticated" || !session?.user?.unionId) return;

    attempted.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/me/union-brand-preset");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          presetId?: string | null;
          theme?: UnionBrandTheme | null;
        };
        if (cancelled) return;
        // Re-check — steward may have saved while we fetched
        if (useBrandStore.getState().hasStoredBrandKit) return;
        if (data.presetId) {
          applyUnionPresetId(data.presetId);
        }
        if (data.theme) {
          applyBrandTheme(data.theme);
        }
      } catch {
        // Best-effort seed; Match control remains available on Brand Kit.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    hasStoredBrandKit,
    status,
    session?.user?.unionId,
    applyUnionPresetId,
    applyBrandTheme,
  ]);

  return null;
}
