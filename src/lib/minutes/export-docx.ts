/**
 * Build a Word document for meeting minutes (ORG-001).
 * Dynamic-imports `docx` so the hub bundle stays light until export runs.
 */

import type { MeetingMinutes } from "@/types/minutes";

function meetingTypeLabel(type: MeetingMinutes["meetingType"]): string {
  switch (type) {
    case "exec":
      return "Executive Board";
    case "general":
      return "General Membership";
    case "committee":
      return "Committee";
    default:
      return type;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function buildMinutesDocxBlob(
  minutes: MeetingMinutes,
  localLabel: string,
): Promise<Blob> {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${localLabel} — Meeting Minutes`,
          bold: true,
          font: "Calibri",
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${meetingTypeLabel(minutes.meetingType)} · ${formatDate(minutes.meetingDate)}`,
          font: "Calibri",
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Status: ${minutes.status}${minutes.approvedAt ? ` (approved ${formatDate(minutes.approvedAt)})` : ""}`,
          italics: true,
          font: "Calibri",
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
          text: "Attendees",
          bold: true,
          font: "Calibri",
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
              : "(none recorded)",
          font: "Calibri",
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: "Motions",
          bold: true,
          font: "Calibri",
          size: 26,
        }),
      ],
    }),
  ];

  if (minutes.motions.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "No motions recorded.",
            italics: true,
            font: "Calibri",
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
              text: `Motion ${index + 1}: ${motion.text}`,
              bold: true,
              font: "Calibri",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `Moved by ${motion.movedBy}; seconded by ${motion.secondedBy}.`,
              font: "Calibri",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `Vote — for ${motion.vote.for}, against ${motion.vote.against}, abstain ${motion.vote.abstain}. Result: ${motion.result}.`,
              font: "Calibri",
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
          text: "Notes",
          bold: true,
          font: "Calibri",
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
            text: "(no notes)",
            italics: true,
            font: "Calibri",
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
              font: "Calibri",
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
          text: `Recorded by ${minutes.recordedByName}`,
          color: "666666",
          font: "Calibri",
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
