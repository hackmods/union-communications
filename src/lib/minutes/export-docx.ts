/**
 * Build a Word document for meeting minutes (ORG-001).
 * Dynamic-imports `docx` so the hub bundle stays light until export runs.
 */

import {
  canvasFontOfficeName,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
} from "@/lib/comms/canvas-fonts";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { logoDisplaySizePx } from "@/lib/export/brand-logo-bytes";
import type { MeetingMinutes } from "@/types/minutes";

export type MinutesDocxStyle = {
  headlineFont?: string;
  bodyFont?: string;
  primaryColor?: string;
  logo?: BrandLogoBytes | null;
  locale?: "en" | "fr";
};

type MinutesLocale = "en" | "fr";

const LABELS = {
  en: {
    meetingMinutes: "Meeting Minutes",
    meetingType: {
      exec: "Executive Board",
      general: "General Membership",
      committee: "Committee",
    },
    status: "Status",
    approved: "approved",
    attendees: "Attendees",
    noAttendees: "(none recorded)",
    motions: "Motions",
    noMotions: "No motions recorded.",
    motion: "Motion",
    movedBy: "Moved by",
    secondedBy: "seconded by",
    voteFor: "for",
    voteAgainst: "against",
    voteAbstain: "abstain",
    votePrefix: "Vote —",
    result: "Result",
    resultValue: {
      carried: "carried",
      defeated: "defeated",
      tabled: "tabled",
    },
    notes: "Notes",
    noNotes: "(no notes)",
    recordedBy: "Recorded by",
  },
  fr: {
    meetingMinutes: "Procès-verbal",
    meetingType: {
      exec: "Bureau exécutif",
      general: "Assemblée générale",
      committee: "Comité",
    },
    status: "Statut",
    approved: "approuvé",
    attendees: "Participants",
    noAttendees: "(aucun inscrit)",
    motions: "Motions",
    noMotions: "Aucune motion consignée.",
    motion: "Motion",
    movedBy: "Proposée par",
    secondedBy: "appuyée par",
    voteFor: "pour",
    voteAgainst: "contre",
    voteAbstain: "abstention",
    votePrefix: "Vote —",
    result: "Résultat",
    resultValue: {
      carried: "adoptée",
      defeated: "rejetée",
      tabled: "mise en suspens",
    },
    notes: "Notes",
    noNotes: "(aucune note)",
    recordedBy: "Consigné par",
  },
} as const;

function hexNoHash(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

function resolveLocale(locale?: MinutesLocale): MinutesLocale {
  return locale === "fr" ? "fr" : "en";
}

function formatDate(iso: string, locale: MinutesLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function headlineFace(style?: MinutesDocxStyle): string {
  return style?.headlineFont ?? canvasFontOfficeName(DEFAULT_HEADLINE_FONT);
}

function bodyFace(style?: MinutesDocxStyle): string {
  return style?.bodyFont ?? canvasFontOfficeName(DEFAULT_BODY_FONT);
}

export async function buildMinutesDocxBlob(
  minutes: MeetingMinutes,
  localLabel: string,
  style?: MinutesDocxStyle,
): Promise<Blob> {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    ImageRun,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const locale = resolveLocale(style?.locale);
  const labels = LABELS[locale];
  const hFont = headlineFace(style);
  const bFont = bodyFace(style);
  const headingColor = style?.primaryColor
    ? hexNoHash(style.primaryColor)
    : undefined;

  const children: InstanceType<typeof Paragraph>[] = [];

  if (style?.logo) {
    const [logoW, logoH] = logoDisplaySizePx(style.logo, 140, 56);
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new ImageRun({
            type: "png",
            data: style.logo.bytes,
            transformation: { width: logoW, height: logoH },
            altText: {
              title: "Logo",
              description: "Local brand logo",
              name: "logo",
            },
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${localLabel} — ${labels.meetingMinutes}`,
          bold: true,
          font: hFont,
          size: 32,
          ...(headingColor ? { color: headingColor } : {}),
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${labels.meetingType[minutes.meetingType]} · ${formatDate(minutes.meetingDate, locale)}`,
          font: bFont,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${labels.status}: ${minutes.status}${minutes.approvedAt ? ` (${labels.approved} ${formatDate(minutes.approvedAt, locale)})` : ""}`,
          italics: true,
          font: bFont,
          size: 20,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: labels.attendees,
          bold: true,
          font: hFont,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text:
            minutes.attendees.length > 0
              ? minutes.attendees.join(", ")
              : labels.noAttendees,
          font: bFont,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: labels.motions,
          bold: true,
          font: hFont,
          size: 26,
        }),
      ],
    }),
  );

  if (minutes.motions.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: labels.noMotions,
            italics: true,
            font: bFont,
            size: 22,
          }),
        ],
      }),
    );
  } else {
    minutes.motions.forEach((motion, index) => {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: `${labels.motion} ${index + 1}: ${motion.text}`,
              bold: true,
              font: bFont,
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `${labels.movedBy} ${motion.movedBy}; ${labels.secondedBy} ${motion.secondedBy}.`,
              font: bFont,
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `${labels.votePrefix} ${labels.voteFor} ${motion.vote.for}, ${labels.voteAgainst} ${motion.vote.against}, ${labels.voteAbstain} ${motion.vote.abstain}. ${labels.result}: ${labels.resultValue[motion.result]}.`,
              font: bFont,
              size: 20,
            }),
          ],
        }),
      );
    });
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: labels.notes,
          bold: true,
          font: hFont,
          size: 26,
        }),
      ],
    }),
  );

  const noteLines = (minutes.notes || "").split(/\n/).filter((l) => l.length > 0);
  if (noteLines.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: labels.noNotes,
            italics: true,
            font: bFont,
            size: 22,
          }),
        ],
      }),
    );
  } else {
    for (const line of noteLines) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: line,
              font: bFont,
              size: 22,
            }),
          ],
        }),
      );
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `${labels.recordedBy} ${minutes.recordedByName}`,
          color: "666666",
          font: bFont,
          size: 18,
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

export function minutesExportFilename(minutes: MeetingMinutes): string {
  const day = minutes.meetingDate.slice(0, 10);
  return `minutes-${minutes.meetingType}-${day}.docx`;
}
