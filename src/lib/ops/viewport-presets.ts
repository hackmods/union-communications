export type ViewportPresetId = "mobile" | "tablet" | "desktop";

export type ViewportAuditId = "audit-390" | "audit-1366";

export type ViewportPreset = {
  id: ViewportPresetId;
  label: string;
  width: number;
  height: number;
};

export type ViewportAuditSize = {
  id: ViewportAuditId;
  label: string;
  width: number;
  height: number;
};

export const VIEWPORT_PRESETS: readonly ViewportPreset[] = [
  { id: "mobile", label: "Mobile (375px)", width: 375, height: 812 },
  { id: "tablet", label: "Tablet (768px)", width: 768, height: 1024 },
  { id: "desktop", label: "Desktop (1280px)", width: 1280, height: 800 },
] as const;

/** Explicit Muse/audit widths — not aliases of product presets. */
export const VIEWPORT_AUDIT_SIZES: readonly ViewportAuditSize[] = [
  { id: "audit-390", label: "Audit 390", width: 390, height: 844 },
  { id: "audit-1366", label: "Audit 1366", width: 1366, height: 768 },
] as const;

export const DEFAULT_VIEWPORT_PRESET: ViewportPresetId = "desktop";

export const VIEWPORT_PATH_HISTORY_KEY = "unionops-viewport-lab-paths";
export const VIEWPORT_PATH_HISTORY_MAX = 12;

export function presetById(id: string): ViewportPreset | undefined {
  return VIEWPORT_PRESETS.find((p) => p.id === id);
}

export function auditSizeById(id: string): ViewportAuditSize | undefined {
  return VIEWPORT_AUDIT_SIZES.find((p) => p.id === id);
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

export function matchAuditSize(
  width: number,
  height: number,
): ViewportAuditId | null {
  const hit = VIEWPORT_AUDIT_SIZES.find(
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
