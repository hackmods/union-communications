import type { FlyerFormatId } from "@/lib/comms/flyer-formats";
import type { FlyerFontChoice } from "@/lib/comms/canvas-fonts";
import type { FlyerLayoutId } from "@/lib/comms/flyer-layouts";
import type {
  FlyerHeadlineCase,
  FlyerTypeScaleOverride,
} from "@/lib/comms/flyer-tokens";

export type FlyerPresetKey =
  | "picket"
  | "rally"
  | "meeting"
  | "walkabout";

/** Layout / typography / QR flags only — copy lives in i18n (`flyerMaker.presets.*`). */
export interface FlyerPresetDesign {
  id: FlyerPresetKey;
  layout: FlyerLayoutId;
  format: FlyerFormatId;
  fontStack: FlyerFontChoice;
  headlineCase: FlyerHeadlineCase;
  typeScaleOverride: FlyerTypeScaleOverride;
  showQr: boolean;
}

export const FLYER_PRESET_ORDER: readonly FlyerPresetKey[] = [
  "picket",
  "rally",
  "meeting",
  "walkabout",
] as const;

export const FLYER_PRESETS: Record<FlyerPresetKey, FlyerPresetDesign> = {
  picket: {
    id: "picket",
    layout: "band",
    format: "letter",
    fontStack: "oswald",
    headlineCase: "uppercase",
    typeScaleOverride: "display",
    showQr: false,
  },
  rally: {
    id: "rally",
    layout: "stack",
    format: "letter",
    fontStack: "oswald",
    headlineCase: "uppercase",
    typeScaleOverride: "display",
    showQr: true,
  },
  meeting: {
    id: "meeting",
    layout: "stack",
    format: "letter",
    fontStack: "sourceSerif",
    headlineCase: "asTyped",
    typeScaleOverride: "compact",
    showQr: true,
  },
  walkabout: {
    id: "walkabout",
    layout: "split",
    format: "halfLetter",
    fontStack: "barlowCondensed",
    headlineCase: "uppercase",
    typeScaleOverride: "dense",
    showQr: true,
  },
};

export function isFlyerPresetKey(value: unknown): value is FlyerPresetKey {
  return (
    value === "picket" ||
    value === "rally" ||
    value === "meeting" ||
    value === "walkabout"
  );
}
