"use client";

import { useCallback, useEffect, useState } from "react";

/** Client countdown for server-provided Retry-After values. */
export function useMfaRetryCountdown() {
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const start = useCallback((seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds)) : 900;
    const startedAt = Date.now();
    setNow(startedAt);
    setRetryUntil(startedAt + safeSeconds * 1000);
  }, []);
  const clear = useCallback(() => setRetryUntil(null), []);
  const secondsRemaining = retryUntil === null
    ? 0
    : Math.max(0, Math.ceil((retryUntil - now) / 1000));

  useEffect(() => {
    if (retryUntil === null) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= retryUntil) setRetryUntil(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  return { start, clear, secondsRemaining, waiting: secondsRemaining > 0 };
}
