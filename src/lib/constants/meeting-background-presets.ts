export type MeetingLayout =
  | "corner"
  | "lower-third"
  | "side-panel"
  | "watermark";

export type MeetingIntensity = "subtle" | "balanced";

export interface MeetingBackgroundPreset {
  id: string;
  /** Short label for the preset picker (English constant; UI can show as-is) */
  label: string;
  headline: string;
  closer: string;
  layout: MeetingLayout;
  intensity: MeetingIntensity;
}

/**
 * Low-key meeting presets — keep the centre clear for a webcam face.
 * No union names; Brand Kit supplies local identity.
 */
export const MEETING_BACKGROUND_PRESETS: readonly MeetingBackgroundPreset[] = [
  {
    id: "local-meeting",
    label: "Local meeting",
    headline: "Local meeting",
    closer: "Members only",
    layout: "lower-third",
    intensity: "subtle",
  },
  {
    id: "in-solidarity",
    label: "In solidarity",
    headline: "In solidarity",
    closer: "Together",
    layout: "corner",
    intensity: "subtle",
  },
  {
    id: "members-only",
    label: "Members only",
    headline: "Members only",
    closer: "",
    layout: "watermark",
    intensity: "subtle",
  },
  {
    id: "fair-work",
    label: "Fair work",
    headline: "Fair work",
    closer: "Dignity on the job",
    layout: "side-panel",
    intensity: "balanced",
  },
  {
    id: "your-voice",
    label: "Your voice matters",
    headline: "Your voice matters",
    closer: "Speak up together",
    layout: "lower-third",
    intensity: "balanced",
  },
  {
    id: "quiet-local",
    label: "Quiet local mark",
    headline: "",
    closer: "",
    layout: "corner",
    intensity: "subtle",
  },
] as const;

export type MeetingBackgroundPresetId =
  (typeof MEETING_BACKGROUND_PRESETS)[number]["id"];

export function getMeetingPresetById(
  id: string,
): MeetingBackgroundPreset | undefined {
  return MEETING_BACKGROUND_PRESETS.find((p) => p.id === id);
}
