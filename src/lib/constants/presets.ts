export const TOOL_PRESETS = {
  agmNotice: {
    id: "agm-notice",
    headline: "Annual General Meeting",
    subheadline: "All members welcome — your voice matters",
    theme: "formal",
  },
  bargainingUpdate: {
    id: "bargaining-update",
    headline: "Bargaining Update",
    subheadline: "Standing strong for fair wages and safe workplaces",
    theme: "urgent",
  },
  strikeAction: {
    id: "strike-action",
    headline: "Strike Action",
    subheadline: "United we stand — solidarity forever",
    theme: "strike",
  },
  memberSpotlight: {
    id: "member-spotlight",
    headline: "Member Spotlight",
    subheadline: "Celebrating the workers who make our local strong",
    theme: "celebration",
  },
} as const;

export type ToolPresetKey = keyof typeof TOOL_PRESETS;
