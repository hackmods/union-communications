/**
 * Build a printable nomination ballot (ORG-003).
 * Dynamic-imports `docx` — not a live online secret ballot.
 */

import type { ElectionCycle } from "@/types/elections";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function buildElectionBallotDocxBlob(
  cycle: ElectionCycle,
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

  const accepted = cycle.nominations.filter((n) => n.status === "accepted");
  const byPosition = new Map<string, typeof accepted>();
  for (const position of cycle.positions) {
    byPosition.set(position, []);
  }
  for (const nom of accepted) {
    const list = byPosition.get(nom.position) ?? [];
    list.push(nom);
    byPosition.set(nom.position, list);
  }

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${localLabel} — Ballot`,
          bold: true,
          font: "Calibri",
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: cycle.title,
          font: "Calibri",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Printed ${formatDate(new Date().toISOString())} · Paper / offline ballot only — not an online vote`,
          italics: true,
          font: "Calibri",
          size: 18,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Mark one candidate per position. Return this paper ballot to the elections committee.",
          font: "Calibri",
          size: 20,
        }),
      ],
    }),
  ];

  for (const position of cycle.positions) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: position,
            bold: true,
            font: "Calibri",
            size: 26,
          }),
        ],
      }),
    );
    const nominees = byPosition.get(position) ?? [];
    if (nominees.length === 0) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "(No accepted nominations for this position)",
              italics: true,
              font: "Calibri",
              size: 20,
              color: "666666",
            }),
          ],
        }),
      );
      continue;
    }
    for (const nom of nominees) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `☐  ${nom.nomineeName}`,
              font: "Calibri",
              size: 22,
            }),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}
