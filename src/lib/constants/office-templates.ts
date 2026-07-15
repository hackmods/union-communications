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
  outputs: { docx: boolean; xlsx: boolean; pptx: boolean };
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
    outputs: { docx: true, xlsx: false, pptx: true },
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
    outputs: { docx: true, xlsx: false, pptx: true },
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
    outputs: { docx: true, xlsx: true, pptx: true },
    structureKeys: [
      "structure.eventDocx",
      "structure.eventXlsx",
      "structure.eventPptx",
    ],
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
        defaultValue: "Agenda highlights and how to RSVP with your steward.",
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
