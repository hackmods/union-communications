/**
 * Document & Slide Generator — branded office presets; Brand Kit only.
 */

import type { BrandKit } from "@/types/entities";

export type OfficePresetId =
  | "simple-letter"
  | "letterhead"
  | "quick-event"
  | "welcome-letter"
  | "seniority-worksheet"
  | "grievance-intake"
  | "lec-directory"
  | "accommodation-letter"
  | "grievance-notice"
  | "representation-request"
  | "meeting-follow-up";

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
  outputs: {
    docx: boolean;
    xlsx: boolean;
    pptx: boolean;
    ics?: boolean;
    email?: boolean;
  };
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
        key: "salutation",
        labelKey: "fields.salutation",
        defaultValue: "",
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
    outputs: { docx: true, xlsx: true, pptx: true, ics: true, email: true },
    structureKeys: [
      "structure.eventDocx",
      "structure.eventXlsx",
      "structure.eventIcs",
      "structure.eventEmail",
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
  {
    id: "welcome-letter",
    titleKey: "presets.welcomeLetter.title",
    blurbKey: "presets.welcomeLetter.blurb",
    fileStem: "welcome-letter",
    outputs: { docx: true, xlsx: false, pptx: true, ics: false },
    structureKeys: [
      "structure.welcomeLetterDocx",
      "structure.welcomeLetterPptx",
    ],
    fields: [
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "July 18, 2026",
      },
      {
        key: "salutation",
        labelKey: "fields.salutation",
        defaultValue: "",
      },
      {
        key: "memberName",
        labelKey: "fields.memberName",
        defaultValue: "New member",
      },
      {
        key: "collection",
        labelKey: "fields.collection",
        defaultValue: "Support Staff",
      },
      {
        key: "body",
        labelKey: "fields.body",
        multiline: true,
        defaultValue:
          "Welcome to your local. Signing your membership card makes you a member in good standing — eligible to vote, run for office, and access union supports.\n\nKeep this letter handy. Your steward and local executive are here when you have questions about your collective agreement, workplace rights, or how to get involved.\n\nIf you have not finished your membership application yet, use the link below or ask a steward for help.",
      },
      {
        key: "membershipUrl",
        labelKey: "fields.membershipUrl",
        defaultValue: "",
      },
      {
        key: "presidentName",
        labelKey: "fields.presidentName",
        defaultValue: "Local president",
      },
      {
        key: "stewardContact",
        labelKey: "fields.stewardContact",
        defaultValue: "steward@example.org",
      },
      {
        key: "contactName",
        labelKey: "fields.contactName",
        defaultValue: "Local executive committee",
      },
    ],
  },
  {
    id: "accommodation-letter",
    titleKey: "presets.accommodationLetter.title",
    blurbKey: "presets.accommodationLetter.blurb",
    fileStem: "accommodation-letter",
    outputs: { docx: true, xlsx: false, pptx: true, ics: false },
    structureKeys: [
      "structure.accommodationLetterDocx",
      "structure.accommodationLetterPptx",
    ],
    fields: [
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "",
      },
      {
        key: "salutation",
        labelKey: "fields.salutation",
        defaultValue: "",
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
          "I am writing on behalf of the member named above regarding return-to-work and/or accommodation. We ask to meet to discuss functional limitations and reasonable measures. Please confirm a meeting time. This letter does not waive any rights under the collective agreement or human rights legislation.",
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
    id: "grievance-notice",
    titleKey: "presets.grievanceNotice.title",
    blurbKey: "presets.grievanceNotice.blurb",
    fileStem: "grievance-notice",
    outputs: { docx: true, xlsx: false, pptx: true, ics: false },
    structureKeys: [
      "structure.grievanceNoticeDocx",
      "structure.grievanceNoticePptx",
    ],
    fields: [
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "",
      },
      {
        key: "salutation",
        labelKey: "fields.salutation",
        defaultValue: "",
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
          "Please take this letter as notice that the union intends to pursue the workplace issue described below under the collective agreement. We ask for early resolution and will follow the grievance timelines that apply. This is not legal advice.",
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
    id: "representation-request",
    titleKey: "presets.representationRequest.title",
    blurbKey: "presets.representationRequest.blurb",
    fileStem: "representation-request",
    outputs: { docx: true, xlsx: false, pptx: true, ics: false },
    structureKeys: [
      "structure.representationRequestDocx",
      "structure.representationRequestPptx",
    ],
    fields: [
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "",
      },
      {
        key: "salutation",
        labelKey: "fields.salutation",
        defaultValue: "",
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
          "The member named above has requested union representation. Please schedule any investigatory or disciplinary meeting with the steward present, and provide the particulars we need to prepare.",
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
    id: "meeting-follow-up",
    titleKey: "presets.meetingFollowUp.title",
    blurbKey: "presets.meetingFollowUp.blurb",
    fileStem: "meeting-follow-up",
    outputs: { docx: true, xlsx: false, pptx: true, ics: false },
    structureKeys: [
      "structure.meetingFollowUpDocx",
      "structure.meetingFollowUpPptx",
    ],
    fields: [
      {
        key: "date",
        labelKey: "fields.date",
        defaultValue: "",
      },
      {
        key: "salutation",
        labelKey: "fields.salutation",
        defaultValue: "",
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
          "Thank you for meeting with us. This letter confirms what we discussed and the next steps we agreed. Please reply if anything below does not match your notes.",
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
    id: "seniority-worksheet",
    titleKey: "presets.seniorityWorksheet.title",
    blurbKey: "presets.seniorityWorksheet.blurb",
    fileStem: "seniority-worksheet",
    outputs: { docx: true, xlsx: true, pptx: false, ics: false },
    structureKeys: [
      "structure.seniorityWorksheetDocx",
      "structure.seniorityWorksheetXlsx",
    ],
    fields: [
      {
        key: "sessionDate",
        labelKey: "fields.sessionDate",
        defaultValue: "",
      },
      {
        key: "chair",
        labelKey: "fields.chair",
        defaultValue: "",
      },
      {
        key: "caseId",
        labelKey: "fields.caseId",
        defaultValue: "",
      },
      {
        key: "committeeNotes",
        labelKey: "fields.committeeNotes",
        multiline: true,
        defaultValue: "",
      },
    ],
  },
  {
    id: "grievance-intake",
    titleKey: "presets.grievanceIntake.title",
    blurbKey: "presets.grievanceIntake.blurb",
    fileStem: "grievance-intake",
    outputs: { docx: true, xlsx: true, pptx: false, ics: false },
    structureKeys: [
      "structure.grievanceIntakeDocx",
      "structure.grievanceIntakeXlsx",
    ],
    fields: [
      {
        key: "incidentDate",
        labelKey: "fields.incidentDate",
        defaultValue: "",
      },
      {
        key: "caArticle",
        labelKey: "fields.caArticle",
        defaultValue: "",
      },
      {
        key: "who",
        labelKey: "fields.who",
        multiline: true,
        defaultValue: "",
      },
      {
        key: "what",
        labelKey: "fields.what",
        multiline: true,
        defaultValue: "",
      },
      {
        key: "where",
        labelKey: "fields.where",
        defaultValue: "",
      },
      {
        key: "when",
        labelKey: "fields.when",
        defaultValue: "",
      },
      {
        key: "why",
        labelKey: "fields.why",
        multiline: true,
        defaultValue: "",
      },
      {
        key: "want",
        labelKey: "fields.want",
        multiline: true,
        defaultValue: "",
      },
      {
        key: "witnesses",
        labelKey: "fields.witnesses",
        multiline: true,
        defaultValue: "",
      },
      {
        key: "clockNotes",
        labelKey: "fields.clockNotes",
        multiline: true,
        defaultValue: "",
      },
    ],
  },
  {
    id: "lec-directory",
    titleKey: "presets.lecDirectory.title",
    blurbKey: "presets.lecDirectory.blurb",
    fileStem: "lec-directory",
    outputs: { docx: true, xlsx: true, pptx: false, ics: false },
    structureKeys: [
      "structure.lecDirectoryDocx",
      "structure.lecDirectoryXlsx",
    ],
    fields: [
      {
        key: "termYears",
        labelKey: "fields.termYears",
        defaultValue: "2026–2028",
      },
      {
        key: "subtitle",
        labelKey: "fields.subtitle",
        defaultValue: "",
      },
      {
        key: "officeEmail",
        labelKey: "fields.officeEmail",
        defaultValue: "",
      },
      {
        key: "officePhone",
        labelKey: "fields.officePhone",
        defaultValue: "",
      },
      {
        key: "officeAddress",
        labelKey: "fields.officeAddress",
        defaultValue: "",
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
