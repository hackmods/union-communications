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

export interface FlyerPreset {
  id: FlyerPresetKey;
  /** i18n key under flyerMaker.presets.<id>.label — stored as stable id */
  layout: FlyerLayoutId;
  format: FlyerFormatId;
  fontStack: FlyerFontChoice;
  headlineCase: FlyerHeadlineCase;
  typeScaleOverride: FlyerTypeScaleOverride;
  message: string;
  body: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  showQr: boolean;
}

export const FLYER_PRESET_ORDER: readonly FlyerPresetKey[] = [
  "picket",
  "rally",
  "meeting",
  "walkabout",
] as const;

export const FLYER_PRESETS: Record<FlyerPresetKey, FlyerPreset> = {
  picket: {
    id: "picket",
    layout: "band",
    format: "letter",
    fontStack: "oswald",
    headlineCase: "uppercase",
    typeScaleOverride: "display",
    message: "PICKET LINE — ALL MEMBERS WELCOME",
    body: "Stand with your co-workers. Bring a friend, water, and a sign.",
    date: "Monday, March 15",
    time: "7:00 AM – 4:00 PM",
    location: "Main entrance",
    contact: "Questions? Ask your steward.",
    showQr: false,
  },
  rally: {
    id: "rally",
    layout: "stack",
    format: "letter",
    fontStack: "oswald",
    headlineCase: "uppercase",
    typeScaleOverride: "display",
    message: "RALLY FOR A FAIR CONTRACT",
    body: "Hear updates from the bargaining team and show management we are united.",
    date: "Saturday, April 5",
    time: "12:00 PM",
    location: "City Hall steps",
    contact: "Questions? Email your local executive.",
    showQr: true,
  },
  meeting: {
    id: "meeting",
    layout: "stack",
    format: "letter",
    fontStack: "sourceSerif",
    headlineCase: "asTyped",
    typeScaleOverride: "compact",
    message: "General Membership Meeting",
    body: "Agenda: bargaining update, steward reports, and member Q&A. All members welcome.",
    date: "Wednesday, March 20",
    time: "5:30 PM",
    location: "Union office",
    contact: "RSVP appreciated — ask your steward.",
    showQr: true,
  },
  walkabout: {
    id: "walkabout",
    layout: "split",
    format: "halfLetter",
    fontStack: "barlowCondensed",
    headlineCase: "uppercase",
    typeScaleOverride: "dense",
    message: "UNION WALKABOUT",
    body: "Meet your stewards on the floor. Bring questions about hours, safety, and rights.",
    date: "This week",
    time: "Breaks & lunch",
    location: "Your department",
    contact: "Scan for more info",
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
