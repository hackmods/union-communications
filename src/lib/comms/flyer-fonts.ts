/**
 * @deprecated Import from `@/lib/comms/canvas-fonts` — kept as a thin re-export
 * for any lingering Flyer Maker imports during the catalog migration.
 */
export {
  DEFAULT_FLYER_FONT,
  FLYER_FONT_ORDER,
  canvasFontFamily,
  flyerFontFamily,
  isFlyerFontChoice as isFlyerFontStackId,
  migrateFlyerFontChoice,
  resolveFlyerFontFamily,
  type CanvasFontId,
  type FlyerFontChoice,
  type FlyerFontChoice as FlyerFontStackId,
} from "@/lib/comms/canvas-fonts";

import {
  CANVAS_FONT_ORDER,
  canvasFontFamily,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";

/** @deprecated Prefer canvasFontFamily from canvas-fonts */
export const FLYER_FONT_STACKS: Record<CanvasFontId, string> = Object.fromEntries(
  CANVAS_FONT_ORDER.map((id) => [id, canvasFontFamily(id)]),
) as Record<CanvasFontId, string>;
