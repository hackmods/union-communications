/**
 * Document & Slide Generator — three high-quality presets; Brand Kit only.
 */

import type { BrandKit } from "@/types/entities";

export type OfficePresetId = "simple-letter" | "letterhead" | "quick-event";

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
  fields: FieldDef[];
  outputs: { docx: boolean; xlsx: boolean; pptx: boolean; ics?: boolean };
  fileStem: string;
  structureKeys: string[];
};

export type BrandPalette = {
  primary: string;
  secondary: string;
  accent: string;
};

export const OFFICE_PRESETS: OfficePreset[] = [
  {
    id: "simple-letter",
    titleKey: "presets.simpleLetter.title",
    blurbKey: "presets.simpleLetter.blurb",
    fileStem: "simple-letter",
    outputs: { docx: true, xlsx: false, pptx: true, ics: false },
    structureKeys: ["structure.simpleLetterDocx", "structure.simpleLetterPptx"],
    fields: [
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "July 15, 2026",
      },
      {
        key: "memberName",
        labelKey: "fields.memberName",
        defaultValue: "Member name",
      },
      {
        key: "body",
        labelKey: "fields.body",
        multiline: true,
        defaultValue:
          "Thank you for speaking with your steward. Here is a short written follow-up on what we discussed and the next step.",
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
    id: "letterhead",
    titleKey: "presets.letterhead.title",
    blurbKey: "presets.letterhead.blurb",
    fileStem: "letterhead",
    outputs: { docx: true, xlsx: false, pptx: true, ics: false },
    structureKeys: ["structure.letterheadDocx", "structure.letterheadPptx"],
    fields: [
      {
        key: "contactName",
        labelKey: "fields.contactName",
        defaultValue: "Local executive committee",
      },
      {
        key: "body",
        labelKey: "fields.body",
        multiline: true,
        defaultValue: "",
      },
    ],
  },
  {
    id: "quick-event",
    titleKey: "presets.quickEvent.title",
    blurbKey: "presets.quickEvent.blurb",
    fileStem: "quick-event",
    outputs: { docx: true, xlsx: true, pptx: true, ics: true },
    structureKeys: [
      "structure.eventDocx",
      "structure.eventXlsx",
      "structure.eventIcs",
      "structure.eventPptx",
    ],
    fields: [
      {
        key: "title",
        labelKey: "fields.title",
        defaultValue: "LEC meeting",
      },
      {
        key: "subtitle",
        labelKey: "fields.subtitle",
        defaultValue: "Hybrid — on site and remote",
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
        key: "calendarStart",
        labelKey: "fields.calendarStart",
        defaultValue: "2026-08-12T12:00",
      },
      {
        key: "calendarEnd",
        labelKey: "fields.calendarEnd",
        defaultValue: "2026-08-12T13:00",
      },
      {
        key: "location",
        labelKey: "fields.location",
        defaultValue: "Boardroom + video link",
      },
      {
        key: "quorumNeeded",
        labelKey: "fields.quorumNeeded",
        defaultValue: "8",
      },
      {
        key: "body",
        labelKey: "fields.body",
        multiline: true,
        defaultValue:
          "Please RSVP on the sheet: Attending (Yes/No/Maybe) and How joining (On site or Remote). On-site numbers drive the food order; Yes counts toward quorum whether you join on site or remote.",
      },
      {
        key: "contactName",
        labelKey: "fields.contactName",
        defaultValue: "Local executive",
      },
    ],
  },
];

export function getPreset(id: OfficePresetId): OfficePreset {
  const found = OFFICE_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown office preset: ${id}`);
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

export function brandPalette(brandKit: BrandKit): BrandPalette {
  return {
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  };
}
