/**
 * Document & Slide Generator — preset catalogue, color keys, and template URLs.
 * Color toggles switch which static baseline under /templates/office/ is fetched.
 */

export type OfficeColorKey = "brand" | "red" | "blue";

export type OfficePresetId =
  | "formal-grievance"
  | "quick-event"
  | "poster-announcement";

export type FieldDef = {
  key: string;
  labelKey: string;
  multiline?: boolean;
  defaultValue?: string;
};

export type OfficePreset = {
  id: OfficePresetId;
  titleKey: string;
  blurbKey: string;
  recommended?: boolean;
  fields: FieldDef[];
  outputs: { docx: boolean; xlsx: boolean; pptx: boolean };
  /** Filename stem before _{color}.{ext} */
  fileStem: string;
};

export type BrandPalette = {
  primary: string;
  secondary: string;
  accent: string;
};

/** Fixed chrome for non-brand colour baselines (hex without # for OOXML fills). */
export const OFFICE_COLOR_CHROME: Record<
  OfficeColorKey,
  BrandPalette & { fillHex: string }
> = {
  brand: {
    primary: "#003366",
    secondary: "#001a33",
    accent: "#c45c26",
    fillHex: "003366",
  },
  red: {
    primary: "#9E1B32",
    secondary: "#5C0A1A",
    accent: "#C45C26",
    fillHex: "9E1B32",
  },
  blue: {
    primary: "#1B4F72",
    secondary: "#0E2F44",
    accent: "#2E86C1",
    fillHex: "1B4F72",
  },
};

export const OFFICE_COLOR_KEYS: OfficeColorKey[] = ["brand", "red", "blue"];

export const OFFICE_PRESETS: OfficePreset[] = [
  {
    id: "formal-grievance",
    titleKey: "presets.formalGrievance.title",
    blurbKey: "presets.formalGrievance.blurb",
    recommended: true,
    fileStem: "formal-grievance",
    outputs: { docx: true, xlsx: true, pptx: true },
    fields: [
      {
        key: "title",
        labelKey: "fields.title",
        defaultValue: "Grievance step summary",
      },
      {
        key: "memberName",
        labelKey: "fields.memberName",
        defaultValue: "Member name",
      },
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "2026-07-15",
      },
      {
        key: "body",
        labelKey: "fields.body",
        multiline: true,
        defaultValue:
          "Brief facts of the dispute, articles cited, and requested remedy.",
      },
      {
        key: "stewardName",
        labelKey: "fields.stewardName",
        defaultValue: "Steward name",
      },
      {
        key: "contactName",
        labelKey: "fields.contactName",
        defaultValue: "Chief steward",
      },
    ],
  },
  {
    id: "quick-event",
    titleKey: "presets.quickEvent.title",
    blurbKey: "presets.quickEvent.blurb",
    recommended: true,
    fileStem: "quick-event",
    outputs: { docx: true, xlsx: true, pptx: true },
    fields: [
      {
        key: "title",
        labelKey: "fields.title",
        defaultValue: "Membership meeting",
      },
      {
        key: "subtitle",
        labelKey: "fields.subtitle",
        defaultValue: "All members welcome",
      },
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "Tuesday, August 12",
      },
      {
        key: "time",
        labelKey: "fields.time",
        defaultValue: "12:00–1:00 pm",
      },
      {
        key: "location",
        labelKey: "fields.location",
        defaultValue: "Main cafeteria",
      },
      {
        key: "body",
        labelKey: "fields.body",
        multiline: true,
        defaultValue: "Agenda highlights and how to RSVP.",
      },
      {
        key: "contactName",
        labelKey: "fields.contactName",
        defaultValue: "Local executive",
      },
    ],
  },
  {
    id: "poster-announcement",
    titleKey: "presets.posterAnnouncement.title",
    blurbKey: "presets.posterAnnouncement.blurb",
    recommended: true,
    fileStem: "poster-announcement",
    outputs: { docx: true, xlsx: false, pptx: true },
    fields: [
      {
        key: "title",
        labelKey: "fields.title",
        defaultValue: "Stand together",
      },
      {
        key: "headline",
        labelKey: "fields.headline",
        defaultValue: "Know your rights",
      },
      {
        key: "body",
        labelKey: "fields.body",
        multiline: true,
        defaultValue: "Short announcement for boards and LEC slides.",
      },
      {
        key: "cta",
        labelKey: "fields.cta",
        defaultValue: "Talk to your steward →",
      },
      {
        key: "contactName",
        labelKey: "fields.contactName",
        defaultValue: "Your local",
      },
    ],
  },
];

export function getPreset(id: OfficePresetId): OfficePreset {
  const found = OFFICE_PRESETS.find((p) => p.id === id);
  if (!found) {
    throw new Error(`Unknown office preset: ${id}`);
  }
  return found;
}

export function defaultFieldsForPreset(
  preset: OfficePreset,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of preset.fields) {
    out[field.key] = field.defaultValue ?? "";
  }
  return out;
}

export function resolveOfficeTemplateUrls(
  preset: OfficePreset,
  colorKey: OfficeColorKey,
): { docx?: string; xlsx?: string } {
  const stem = `${preset.fileStem}_${colorKey}`;
  return {
    docx: preset.outputs.docx
      ? `/templates/office/docx/${stem}.docx`
      : undefined,
    xlsx: preset.outputs.xlsx
      ? `/templates/office/xlsx/${stem}.xlsx`
      : undefined,
  };
}

/**
 * Palette for PPT embeds and preview swatches.
 * `brand` uses live Brand Kit; red/blue use baked chrome constants.
 */
export function paletteForColorKey(
  colorKey: OfficeColorKey,
  brand: BrandPalette,
): BrandPalette {
  if (colorKey === "brand") {
    return {
      primary: brand.primary,
      secondary: brand.secondary,
      accent: brand.accent,
    };
  }
  const chrome = OFFICE_COLOR_CHROME[colorKey];
  return {
    primary: chrome.primary,
    secondary: chrome.secondary,
    accent: chrome.accent,
  };
}
