"use client";

import type { ReactNode } from "react";
import { useBrandStore } from "@/store/brand-store";
import { isGuideHiddenForPreset } from "@/lib/comms/preset-guide-visibility";

/**
 * When Brand Kit selects a preset that hides this guide path, render `fallback`
 * instead of the generic playbook body.
 */
export function PresetGuideVisibility({
  path,
  fallback,
  children,
}: {
  path: string;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const unionPresetId = useBrandStore((state) => state.brandKit.unionPresetId);
  const hydrated = useBrandStore((state) => state.hydrated);
  if (!hydrated) return <>{children}</>;
  if (isGuideHiddenForPreset(path, unionPresetId)) return <>{fallback}</>;
  return <>{children}</>;
}
