export type MeetingLayout =
  | "corner"
  | "lower-third"
  | "side-panel"
  | "bands";

export interface MeetingBackgroundPreset {
  id: string;
  /** Short label for the preset picker (English constant; UI can show as-is) */
  label: string;
  leadIn: string;
  headline: string;
  closer: string;
  layout: MeetingLayout;
}

/**
 * Solidarity-energy presets for Zoom/Teams — punchy type, face-safe layouts.
 * No union names; Brand Kit supplies local identity.
 */
export const MEETING_BACKGROUND_PRESETS: readonly MeetingBackgroundPreset[] = [
  {
    id: "solidarity-forever",
    label: "SOLIDARITY FOREVER",
    leadIn: "Keep calm and",
    headline: "SOLIDARITY\nFOREVER",
    closer: "Together we win",
    layout: "lower-third",
  },
  {
    id: "united-bargain",
    label: "UNITED WE BARGAIN",
    leadIn: "Remember",
    headline: "UNITED WE\nBARGAIN",
    closer: "Divided we beg",
    layout: "side-panel",
  },
  {
    id: "injury-to-one",
    label: "AN INJURY TO ALL",
    leadIn: "An injury to one",
    headline: "IS AN INJURY\nTO ALL",
    closer: "Stand with your coworkers",
    layout: "bands",
  },
  {
    id: "organize",
    label: "ORGANIZE",
    leadIn: "The time is now",
    headline: "ORGANIZE",
    closer: "Power in numbers",
    layout: "corner",
  },
  {
    id: "union-strong",
    label: "UNION STRONG",
    leadIn: "We are",
    headline: "UNION\nSTRONG",
    closer: "And we are not alone",
    layout: "lower-third",
  },
  {
    id: "fairness",
    label: "FAIRNESS IS NON-NEGOTIABLE",
    leadIn: "Know this",
    headline: "FAIRNESS IS\nNON-NEGOTIABLE",
    closer: "Respect at work",
    layout: "side-panel",
  },
  {
    id: "your-voice",
    label: "YOUR VOICE YOUR UNION",
    leadIn: "Use it",
    headline: "YOUR VOICE\nYOUR UNION",
    closer: "Get involved",
    layout: "bands",
  },
] as const;

export type MeetingBackgroundPresetId =
  (typeof MEETING_BACKGROUND_PRESETS)[number]["id"];

export function getMeetingPresetById(
  id: string,
): MeetingBackgroundPreset | undefined {
  return MEETING_BACKGROUND_PRESETS.find((p) => p.id === id);
}

export function headlineLines(headline: string): string[] {
  return headline
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
