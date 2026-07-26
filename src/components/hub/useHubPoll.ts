"use client";

import { useEffect, useRef } from "react";

const DEFAULT_INTERVAL_MS = 15_000;

/** Lightweight poll-on-focus for Hub threads/tasks (no websockets). */
export function useHubPoll(
  enabled: boolean,
  onPoll: () => void | Promise<void>,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const onPollRef = useRef(onPoll);

  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void onPollRef.current();
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs]);
}
