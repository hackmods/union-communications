"use client";

import { useCallback, useState } from "react";

export function useUndoRedo<T>(initialState: T, maxHistory = 20) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prev) => {
        const current = prev[index];
        const next =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(current)
            : newState;
        const trimmed = prev.slice(0, index + 1);
        const updated = [...trimmed, next].slice(-maxHistory);
        return updated;
      });
      setIndex((prev) => Math.min(prev + 1, maxHistory - 1));
    },
    [index, maxHistory],
  );

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, history.length - 1));
  }, [history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const reset = useCallback((newInitial: T) => {
    setHistory([newInitial]);
    setIndex(0);
  }, []);

  return { state, setState, undo, redo, canUndo, canRedo, reset };
}
