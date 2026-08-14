/** Flyer Maker layout ids (shared by presets + canvas). */

export type FlyerLayoutId = "stack" | "band" | "split" | "photoHero";

export const FLYER_LAYOUT_ORDER: readonly FlyerLayoutId[] = [
  "stack",
  "band",
  "split",
  "photoHero",
] as const;

export const DEFAULT_FLYER_LAYOUT: FlyerLayoutId = "stack";

export function isFlyerLayoutId(value: unknown): value is FlyerLayoutId {
  return (
    value === "stack" ||
    value === "band" ||
    value === "split" ||
    value === "photoHero"
  );
}

/** Photo controls apply to split (optional) and photoHero. */
export function flyerLayoutSupportsPhoto(layout: FlyerLayoutId): boolean {
  return layout === "split" || layout === "photoHero";
}
