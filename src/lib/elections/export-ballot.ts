/**
 * Build a printable nomination ballot (ORG-003).
 * Dynamic-imports `docx` — not a live online secret ballot.
 */

import {
  canvasFontOfficeName,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { logoDisplaySizePx } from "@/lib/export/brand-logo-bytes";
import type { ElectionCycle } from "@/types/elections";

export type BallotDocxStyle = {
  headlineFont?: string;
  bodyFont?: string;
  /** Catalog ids for OOXML binary embed (offline Word). */
  headlineFontId?: CanvasFontId;
  bodyFontId?: CanvasFontId;
  primaryColor?: string;
  logo?: BrandLogoBytes | null;
  locale?: "en" | "fr";
};

type BallotLocale = "en" | "fr";

const LABELS = {
  en: {
    ballot: "Ballot",
    printed: "Printed",
    offlineNotice:
      "Paper / offline ballot only — not an online vote",
    instructions:
      "Mark one candidate per position. Return this paper ballot to the elections committee.",
    noNominees: "(No accepted nominations for this position)",
  },
  fr: {
    ballot: "Bulletin de vote",
    printed: "Imprimé le",
    offlineNotice:
      "Bulletin papier / hors ligne seulement — ce n'est pas un vote en ligne",
    instructions:
      "Cochez un candidat par poste. Remettez ce bulletin papier au comité électoral.",
    noNominees: "(Aucune candidature acceptée pour ce poste)",
  },
} as const;

function hexNoHash(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

function resolveLocale(locale?: BallotLocale): BallotLocale {
  return locale === "fr" ? "fr" : "en";
}

function formatDate(iso: string, locale: BallotLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function headlineFace(style?: BallotDocxStyle): string {
  return style?.headlineFont ?? canvasFontOfficeName(DEFAULT_HEADLINE_FONT);
}

function bodyFace(style?: BallotDocxStyle): string {
  return style?.bodyFont ?? canvasFontOfficeName(DEFAULT_BODY_FONT);
}

export async function buildElectionBallotDocxBlob(
  cycle: ElectionCycle,
  localLabel: string,
  style?: BallotDocxStyle,
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

  const children: InstanceType<typeof Paragraph>[] = [];

  if (style?.logo) {
    const [logoW, logoH] = logoDisplaySizePx(style.logo, 140, 56);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
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
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${localLabel} — ${labels.ballot}`,
          bold: true,
          font: hFont,
          size: 32,
          ...(headingColor ? { color: headingColor } : {}),
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: cycle.title,
          font: bFont,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${labels.printed} ${formatDate(new Date().toISOString(), locale)} · ${labels.offlineNotice}`,
          italics: true,
          font: bFont,
          size: 18,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: labels.instructions,
          font: bFont,
          size: 20,
        }),
      ],
    }),
  );

  for (const position of cycle.positions) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: position,
            bold: true,
            font: hFont,
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
              text: labels.noNominees,
              italics: true,
              font: bFont,
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
              font: bFont,
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
  const blob = await Packer.toBlob(doc);
  const headlineFontId = style?.headlineFontId ?? DEFAULT_HEADLINE_FONT;
  const bodyFontId = style?.bodyFontId ?? DEFAULT_BODY_FONT;
  const { embedDocxBrandFonts } = await import("@/lib/export/ooxml-font-embed");
  return embedDocxBrandFonts(blob, headlineFontId, bodyFontId);
}
