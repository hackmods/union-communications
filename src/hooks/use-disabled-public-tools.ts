"use client";

import { useEffect, useState } from "react";

/**
 * Client hook: loads resolved disabled public tool slugs for nav/catalog.
 */
export function useDisabledPublicTools(opts?: {
  unionId?: string | null;
  localId?: string | null;
}): string[] {
  const [disabled, setDisabled] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (opts?.unionId) params.set("unionId", opts.unionId);
    if (opts?.localId) params.set("localId", opts.localId);
    void fetch(`/api/public-tools/visibility?${params}`)
      .then((res) => (res.ok ? res.json() : { disabled: [] }))
      .then((data: { disabled?: string[] }) => {
        if (!cancelled) setDisabled(data.disabled ?? []);
      })
      .catch(() => {
        if (!cancelled) setDisabled([]);
      });
    return () => {
      cancelled = true;
    };
  }, [opts?.unionId, opts?.localId]);

  return disabled;
}
