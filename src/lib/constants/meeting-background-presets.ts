export type MeetingDesignSet = "bold" | "minimal";

export type MeetingBoldLayout =
  | "corner"
  | "lower-third"
  | "side-panel"
  | "bands";

export type MeetingMinimalLayout =
  | "masthead"
  | "footer"
  | "rails"
  | "upper-stack";

export type MeetingLayout = MeetingBoldLayout | MeetingMinimalLayout;

export const BOLD_MEETING_LAYOUTS: readonly MeetingBoldLayout[] = [
  "corner",
  "lower-third",
  "side-panel",
  "bands",
] as const;

export const MINIMAL_MEETING_LAYOUTS: readonly MeetingMinimalLayout[] = [
  "masthead",
  "footer",
  "rails",
  "upper-stack",
] as const;

export interface MeetingBackgroundPreset {
  id: string;
  /** Short label for the preset picker (English constant; UI can show as-is) */
  label: string;
  leadIn: string;
  headline: string;
  closer: string;
  /** Default Bold (landscape) layout */
  layout: MeetingBoldLayout;
  /** Default Minimal layout (landscape + portrait) */
  minimalLayout: MeetingMinimalLayout;
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
    minimalLayout: "footer",
  },
  {
    id: "united-bargain",
    label: "UNITED WE BARGAIN",
    leadIn: "Remember",
    headline: "UNITED WE\nBARGAIN",
    closer: "Divided we beg",
    layout: "side-panel",
    minimalLayout: "rails",
  },
  {
    id: "injury-to-one",
    label: "AN INJURY TO ALL",
    leadIn: "An injury to one",
    headline: "IS AN INJURY\nTO ALL",
    closer: "Stand with your coworkers",
    layout: "bands",
    minimalLayout: "masthead",
  },
  {
    id: "organize",
    label: "ORGANIZE",
    leadIn: "The time is now",
    headline: "ORGANIZE",
    closer: "Power in numbers",
    layout: "corner",
    minimalLayout: "upper-stack",
  },
  {
    id: "union-strong",
    label: "UNION STRONG",
    leadIn: "We are",
    headline: "UNION\nSTRONG",
    closer: "And we are not alone",
    layout: "lower-third",
    minimalLayout: "footer",
  },
  {
    id: "fairness",
    label: "FAIRNESS IS NON-NEGOTIABLE",
    leadIn: "Know this",
    headline: "FAIRNESS IS\nNON-NEGOTIABLE",
    closer: "Respect at work",
    layout: "side-panel",
    minimalLayout: "rails",
  },
  {
    id: "your-voice",
    label: "YOUR VOICE YOUR UNION",
    leadIn: "Use it",
    headline: "YOUR VOICE\nYOUR UNION",
    closer: "Get involved",
    layout: "bands",
    minimalLayout: "masthead",
  },
] as const;

export type MeetingBackgroundPresetId =
  (typeof MEETING_BACKGROUND_PRESETS)[number]["id"];

export function getMeetingPresetById(
  id: string,
): MeetingBackgroundPreset | undefined {
  return MEETING_BACKGROUND_PRESETS.find((p) => p.id === id);
}

export function isBoldLayout(layout: MeetingLayout): layout is MeetingBoldLayout {
  return (BOLD_MEETING_LAYOUTS as readonly string[]).includes(layout);
}

export function isMinimalLayout(
  layout: MeetingLayout,
): layout is MeetingMinimalLayout {
  return (MINIMAL_MEETING_LAYOUTS as readonly string[]).includes(layout);
}

export function layoutsForDesignSet(
  design: MeetingDesignSet,
): readonly MeetingLayout[] {
  return design === "bold" ? BOLD_MEETING_LAYOUTS : MINIMAL_MEETING_LAYOUTS;
}

export function designSetForLayout(layout: MeetingLayout): MeetingDesignSet {
  return isBoldLayout(layout) ? "bold" : "minimal";
}

export function layoutForDesignSet(
  preset: MeetingBackgroundPreset,
  design: MeetingDesignSet,
): MeetingLayout {
  return design === "bold" ? preset.layout : preset.minimalLayout;
}

export function headlineLines(headline: string): string[] {
  return headline
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
