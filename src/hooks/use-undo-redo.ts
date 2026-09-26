"use client";

import { useCallback, useState } from "react";

type HistoryState<T> = {
  entries: T[];
  index: number;
};

/**
 * Undo/redo stack. History index lives in the same state atom as entries so
 * batched `setState` calls in one render (e.g. hydrate + brand seed) cannot
 * leave `index` past `entries.length` and yield `undefined` current state.
 */
export function useUndoRedo<T>(initialState: T, maxHistory = 20) {
  const [history, setHistory] = useState<HistoryState<T>>({
    entries: [initialState],
    index: 0,
  });

  const state = history.entries[history.index] ?? history.entries[0]!;

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prev) => {
        const current =
          prev.entries[prev.index] ?? prev.entries[prev.entries.length - 1]!;
        const next =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(current)
            : newState;
        const trimmed = prev.entries.slice(0, prev.index + 1);
        const entries = [...trimmed, next].slice(-maxHistory);
        return { entries, index: entries.length - 1 };
      });
    },
    [maxHistory],
  );

  const undo = useCallback(() => {
    setHistory((prev) => ({
      ...prev,
      index: Math.max(prev.index - 1, 0),
    }));
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => ({
      ...prev,
      index: Math.min(prev.index + 1, prev.entries.length - 1),
    }));
  }, []);

  const canUndo = history.index > 0;
  const canRedo = history.index < history.entries.length - 1;

  const reset = useCallback((newInitial: T) => {
    setHistory({ entries: [newInitial], index: 0 });
  }, []);

  return { state, setState, undo, redo, canUndo, canRedo, reset };
}
