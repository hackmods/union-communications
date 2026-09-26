export type ViewportPresetId = "mobile" | "tablet" | "desktop";

export type ViewportPreset = {
  id: ViewportPresetId;
  label: string;
  width: number;
  height: number;
};

export const VIEWPORT_PRESETS: readonly ViewportPreset[] = [
  { id: "mobile", label: "Mobile (375px)", width: 375, height: 812 },
  { id: "tablet", label: "Tablet (768px)", width: 768, height: 1024 },
  { id: "desktop", label: "Desktop (1280px)", width: 1280, height: 800 },
] as const;

export const DEFAULT_VIEWPORT_PRESET: ViewportPresetId = "desktop";

export function presetById(id: string): ViewportPreset | undefined {
  return VIEWPORT_PRESETS.find((p) => p.id === id);
}

export function matchPreset(
  width: number,
  height: number,
): ViewportPresetId | null {
  const hit = VIEWPORT_PRESETS.find(
    (p) => p.width === width && p.height === height,
  );
  return hit?.id ?? null;
}

export const VIEWPORT_LAB_API_VERSION = 1 as const;

export const VIEWPORT_LAB_CAPABILITIES_V1 = [
  "viewport",
  "preset",
  "navigate",
  "orientation",
  "locale",
  "overflow",
] as const;

/** Phase 2 additive capabilities (same API version). */
export const VIEWPORT_LAB_CAPABILITIES_V2 = [
  ...VIEWPORT_LAB_CAPABILITIES_V1,
  "axe",
  "compare",
] as const;

export type ViewportLabCapability =
  (typeof VIEWPORT_LAB_CAPABILITIES_V2)[number];
