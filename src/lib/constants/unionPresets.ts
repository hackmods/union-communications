/**
 * Starter branding presets for common Canadian unions.
 * Colours are generic approximations for local graphics — not official trademarked palettes.
 */

export interface UnionBranding {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  defaultSlogans: string[];
}

/** Bright orange platform default — generic, not affiliated with any union brand. */
export const PLATFORM_UNION_ORANGE = {
  primary: "#FF6B00",
  secondary: "#FFFFFF",
  accent: "#C2410C",
} as const;

export const UNION_PRESETS: UnionBranding[] = [
  {
    id: "opseu",
    name: "OPSEU",
    primaryColor: "#003DA5",
    secondaryColor: "#FFFFFF",
    defaultSlogans: [
      "Members first",
      "Stronger together",
      "Solidarity forever",
    ],
  },
  {
    id: "cupe",
    name: "CUPE",
    primaryColor: "#CE1126",
    secondaryColor: "#FFFFFF",
    defaultSlogans: [
      "Public services for all",
      "Workers united",
      "Fighting for fairness",
    ],
  },
  {
    id: "unifor",
    name: "Unifor",
    primaryColor: "#007A33",
    secondaryColor: "#FFFFFF",
    defaultSlogans: [
      "Moving forward together",
      "Good jobs for all",
      "Union strong",
    ],
  },
  {
    id: "usw",
    name: "USW",
    primaryColor: "#003366",
    secondaryColor: "#FFD100",
    defaultSlogans: [
      "One day longer",
      "Steel strong",
      "Stand up for workers",
    ],
  },
  {
    id: "ona",
    name: "ONA",
    primaryColor: "#0055A4",
    secondaryColor: "#FFFFFF",
    defaultSlogans: [
      "Nurses care",
      "Patients over profits",
      "Safe staffing now",
    ],
  },
  {
    id: "psac",
    name: "PSAC",
    primaryColor: "#E31837",
    secondaryColor: "#003366",
    defaultSlogans: [
      "Proud to serve",
      "Fairness for public workers",
      "Solidarity across Canada",
    ],
  },
];

export function getUnionPreset(id: string): UnionBranding | undefined {
  return UNION_PRESETS.find((p) => p.id === id);
}

/** Darken a hex colour for accent use on light backgrounds. */
export function deriveAccentFromPrimary(primaryColor: string): string {
  const hex = primaryColor.replace("#", "");
  if (hex.length !== 6) return PLATFORM_UNION_ORANGE.accent;
  const r = Math.max(0, Math.round(parseInt(hex.slice(0, 2), 16) * 0.72));
  const g = Math.max(0, Math.round(parseInt(hex.slice(2, 4), 16) * 0.72));
  const b = Math.max(0, Math.round(parseInt(hex.slice(4, 6), 16) * 0.72));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

export function colorsFromUnionPreset(preset: UnionBranding): {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
} {
  return {
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    accentColor: deriveAccentFromPrimary(preset.primaryColor),
  };
}
