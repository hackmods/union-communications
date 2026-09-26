"use client";

import { useEffect, useTransition } from "react";
import { useBrandStore } from "@/store/brand-store";
import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";

/**
 * Sticky undo-redo companion: hydrate once after Brand Kit, debounce-save.
 * Caller owns useUndoRedo; this only persists T with a type guard.
 *
 * Do not also call undo/redo setState/reset from a Brand Kit seed in the
 * same hydrate tick — fold seed fields into the stored draft (or one setState)
 * so history cannot race. See DocumentGeneratorEditor + useUndoRedo.
 */
export function useStickyToolDraft<T>(options: {
  storageKey: string;
  isValid: (v: unknown) => v is T;
  state: T;
  setState: (next: T | ((prev: T) => T)) => void;
  draftHydrated: boolean;
  setDraftHydrated: (v: boolean) => void;
  onSaveFailed?: (failed: boolean) => void;
  debounceMs?: number;
}) {
  const brandHydrated = useBrandStore((s) => s.hydrated);
  const [, startTransition] = useTransition();
  const {
    storageKey,
    isValid,
    state,
    setState,
    draftHydrated,
    setDraftHydrated,
    onSaveFailed,
    debounceMs = 400,
  } = options;

  useEffect(() => {
    if (!brandHydrated || draftHydrated) return;
    startTransition(() => {
      const stored = loadJsonDraft(storageKey, isValid);
      if (stored) setState(stored);
      setDraftHydrated(true);
    });
  }, [
    brandHydrated,
    draftHydrated,
    storageKey,
    isValid,
    setState,
    setDraftHydrated,
    startTransition,
  ]);

  useEffect(() => {
    if (!draftHydrated) return;
    const timer = window.setTimeout(() => {
      const ok = saveJsonDraft(storageKey, state);
      startTransition(() => onSaveFailed?.(!ok));
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [
    state,
    draftHydrated,
    storageKey,
    debounceMs,
    onSaveFailed,
    startTransition,
  ]);
}

export function clearStickyToolDraft(storageKey: string): boolean {
  return clearJsonDraft(storageKey);
}
