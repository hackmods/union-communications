"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `seed` once after Brand Kit hydrate (and optional extra gate).
 * Replaces repeated hydrated + useRef + eslint-disable patterns.
 */
export function useOneShotBrandSeed(
  hydrated: boolean,
  seed: () => void,
  ready: boolean = true,
) {
  const seeded = useRef(false);
  useEffect(() => {
    if (!hydrated || !ready || seeded.current) return;
    seeded.current = true;
    seed();
    // intentionally one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ready]);
}
