"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Reads `?example=` (or custom param) once and calls `apply`.
 * Return `false` when the id is not handled so a later brand seed can run.
 */
export function useExamplePostSeed(
  apply: (exampleId: string) => boolean | void,
  paramName = "example",
  ready: boolean = true,
) {
  const searchParams = useSearchParams();
  const applied = useRef(false);

  useEffect(() => {
    if (!ready || applied.current) return;
    const exampleId = searchParams.get(paramName);
    if (!exampleId) return;
    const handled = apply(exampleId);
    if (handled !== false) {
      applied.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [searchParams, paramName, ready]);
}
