/**
 * Capture-safe system font stacks for Flyer Maker (ADR-014 — no remote webfonts).
 * Applied only inside the export capture root.
 */

export type FlyerFontStackId =
  | "impact"
  | "condensed"
  | "clean"
  | "slab"
  | "serif";

export const FLYER_FONT_ORDER: readonly FlyerFontStackId[] = [
  "impact",
  "condensed",
  "clean",
  "slab",
  "serif",
] as const;

export const DEFAULT_FLYER_FONT: FlyerFontStackId = "clean";

export const FLYER_FONT_STACKS: Record<FlyerFontStackId, string> = {
  impact: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
  condensed: '"Arial Narrow", Arial, Helvetica, sans-serif',
  clean: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  slab: 'Rockwell, "Courier New", Georgia, serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
};

export function isFlyerFontStackId(value: unknown): value is FlyerFontStackId {
  return (
    value === "impact" ||
    value === "condensed" ||
    value === "clean" ||
    value === "slab" ||
    value === "serif"
  );
}

export function flyerFontFamily(id: FlyerFontStackId): string {
  return FLYER_FONT_STACKS[id];
}
