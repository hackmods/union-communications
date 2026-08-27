"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Load a localStorage draft once, then debounce-save on change.
 * Surfaces saveFailed when localStorage is blocked or over quota.
 */
export function useStewardGuideDraft<T>(options: {
  load: () => T | null;
  save: (draft: T) => boolean;
  createEmpty: () => T;
  clearStorage?: () => boolean;
  debounceMs?: number;
}): {
  draft: T;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  hydrated: boolean;
  saveFailed: boolean;
  clear: () => void;
} {
  const { load, save, createEmpty, clearStorage, debounceMs = 400 } = options;
  const [draft, setDraft] = useState<T>(() => createEmpty());
  const [hydrated, setHydrated] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [, startTransition] = useTransition();
  const skipSave = useRef(true);

  useEffect(() => {
    const stored = load();
    startTransition(() => {
      if (stored) setDraft(stored);
      setHydrated(true);
      skipSave.current = false;
    });
    // Intentionally once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || skipSave.current) return;
    const timer = window.setTimeout(() => {
      const ok = save(draft);
      setSaveFailed(!ok);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [draft, hydrated, save, debounceMs]);

  const clear = () => {
    skipSave.current = true;
    clearStorage?.();
    setDraft(createEmpty());
    setSaveFailed(false);
    window.setTimeout(() => {
      skipSave.current = false;
    }, 0);
  };

  return { draft, setDraft, hydrated, saveFailed, clear };
}
