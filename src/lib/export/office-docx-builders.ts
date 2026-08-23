/**
 * Brand Kit–driven Word documents via the `docx` library (no static colour stubs).
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { BrandPalette } from "@/lib/constants/office-templates";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { logoDisplaySizePx } from "@/lib/export/brand-logo-bytes";
import {
  canvasFontOfficeName,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
} from "@/lib/comms/canvas-fonts";
import { pickContrastingInk } from "@/lib/utils/ink";

export type DocxBuildInput = {
  palette: BrandPalette;
  localLabel: string;
  fields: Record<string, string>;
  logo?: BrandLogoBytes | null;
  /** Office face name for titles (Brand Kit headline). Not embedded in the file. */
  headlineFont?: string;
  /** Office face name for body copy (Brand Kit body). Not embedded in the file. */
  bodyFont?: string;
};

function hexNoHash(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

function headlineFace(opts: DocxBuildInput): string {
  return opts.headlineFont ?? canvasFontOfficeName(DEFAULT_HEADLINE_FONT);
}

function bodyFace(opts: DocxBuildInput): string {
  return opts.bodyFont ?? canvasFontOfficeName(DEFAULT_BODY_FONT);
}

function bodyParagraphs(text: string, font: string): Paragraph[] {
  const parts = (text || "").split(/\n+/).filter((p) => p.length > 0);
  if (parts.length === 0) {
    return [
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: " ", font, size: 22 })],
      }),
    ];
  }
  return parts.map(
    (line) =>
      new Paragraph({
        spacing: { after: 200, line: 276 },
        children: [
          new TextRun({
            text: line,
            font,
            size: 22,
          }),
        ],
      }),
  );
}

function letterheadHeader(opts: DocxBuildInput): Header {
  const primary = hexNoHash(opts.palette.primary);
  const ink = hexNoHash(pickContrastingInk(opts.palette.primary));
  const contact = opts.fields.contactName || "";
  const hFont = headlineFace(opts);
  const bFont = bodyFace(opts);
  const [logoW, logoH] = opts.logo
    ? logoDisplaySizePx(opts.logo, 140, 56)
    : [0, 0];

  const logoCellChildren = opts.logo
    ? [
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: opts.logo.bytes,
              transformation: { width: logoW, height: logoH },
              altText: {
                title: "Logo",
                description: "Local brand logo",
                name: "logo",
              },
            }),
          ],
        }),
      ]
    : [
        new Paragraph({
          children: [
            new TextRun({
              text: " ",
              font: bFont,
              size: 20,
            }),
          ],
        }),
      ];

  const table = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 7160],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: primary },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: primary },
              bottom: { style: BorderStyle.NONE, size: 0, color: primary },
              left: { style: BorderStyle.NONE, size: 0, color: primary },
              right: { style: BorderStyle.NONE, size: 0, color: primary },
            },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: logoCellChildren,
          }),
          new TableCell({
            width: { size: 7160, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: primary },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: primary },
              bottom: { style: BorderStyle.NONE, size: 0, color: primary },
              left: { style: BorderStyle.NONE, size: 0, color: primary },
              right: { style: BorderStyle.NONE, size: 0, color: primary },
            },
            margins: { top: 100, bottom: 100, left: 120, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: opts.localLabel,
                    bold: true,
                    color: ink,
                    font: hFont,
                    size: 28,
                  }),
                ],
              }),
              ...(contact
                ? [
                    new Paragraph({
                      spacing: { before: 60 },
                      children: [
                        new TextRun({
                          text: contact,
                          color: ink,
                          font: bFont,
                          size: 20,
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });

  return new Header({
    children: [
      table,
      new Paragraph({
        spacing: { after: 200 },
        children: [],
      }),
    ],
  });
}

function baseDocument(
  opts: DocxBuildInput,
  children: (Paragraph | Table)[],
): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 1008,
              bottom: 1008,
              left: 1008,
            },
          },
        },
        headers: {
          default: letterheadHeader(opts),
        },
        children,
      },
    ],
  });
}

/** Blank LEC directory positions — Brand Kit chrome only; no roster pull. */
export const LEC_DIRECTORY_PLACEHOLDER_POSITIONS: readonly string[] = [
  "President",
  "Vice-President",
  "Secretary",
  "Treasurer",
  "Steward",
  "",
  "",
  "",
  "Trustee",
  "",
  "",
];

function lecDirectoryCell(
  text: string,
  opts: { bold?: boolean; fill?: string; ink?: string; font: string; width: number },
): TableCell {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill }
      : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
    },
    children: [
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: text || " ",
            bold: opts.bold,
            color: opts.ink,
            font: opts.font,
            size: opts.bold ? 18 : 20,
          }),
        ],
      }),
    ],
  });
}

/**
 * Blank branded LEC directory (Position | Name | Location).
 * Placeholder rows only — never pulls Org Chart / Hub member data.
 */
export async function buildLecDirectoryDocx(
  opts: DocxBuildInput,
): Promise<Blob> {
  const primary = hexNoHash(opts.palette.primary);
  const ink = hexNoHash(pickContrastingInk(opts.palette.primary));
  const hFont = headlineFace(opts);
  const bFont = bodyFace(opts);
  const term = opts.fields.termYears?.trim() || "";
  const subtitle = opts.fields.subtitle?.trim() || "";
  const colW = [2400, 3200, 2400] as const;

  const headerRow = new TableRow({
    children: [
      lecDirectoryCell("Position", {
        bold: true,
        fill: primary,
        ink,
        font: hFont,
        width: colW[0],
      }),
      lecDirectoryCell("Name", {
        bold: true,
        fill: primary,
        ink,
        font: hFont,
        width: colW[1],
      }),
      lecDirectoryCell("Location", {
        bold: true,
        fill: primary,
        ink,
        font: hFont,
        width: colW[2],
      }),
    ],
  });

  const dataRows = LEC_DIRECTORY_PLACEHOLDER_POSITIONS.map(
    (position) =>
      new TableRow({
        children: [
          lecDirectoryCell(position, { font: bFont, width: colW[0], bold: true }),
          lecDirectoryCell("", { font: bFont, width: colW[1] }),
          lecDirectoryCell("", { font: bFont, width: colW[2] }),
        ],
      }),
  );

  const table = new Table({
    width: { size: 8000, type: WidthType.DXA },
    rows: [headerRow, ...dataRows],
  });

  const footerBits = [
    opts.fields.officeEmail?.trim(),
    opts.fields.officePhone?.trim(),
    opts.fields.officeAddress?.trim(),
  ].filter(Boolean);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "LOCAL EXECUTIVE COMMITTEE",
          bold: true,
          font: hFont,
          size: 32,
          color: hexNoHash(opts.palette.secondary),
        }),
      ],
    }),
    ...(term
      ? [
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Term ${term}`,
                font: bFont,
                size: 22,
              }),
            ],
          }),
        ]
      : []),
    ...(subtitle
      ? [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: subtitle,
                font: bFont,
                size: 20,
                color: "555555",
              }),
            ],
          }),
        ]
      : [
          new Paragraph({
            spacing: { after: 200 },
            children: [],
          }),
        ]),
    table,
    new Paragraph({
      spacing: { before: 280 },
      children: [
        new TextRun({
          text: footerBits.length
            ? footerBits.join("  ·  ")
            : "Office email / phone / address",
          color: "666666",
          font: bFont,
          size: 18,
        }),
      ],
    }),
  ];

  return Packer.toBlob(baseDocument(opts, children));
}

export async function buildSimpleLetterDocx(
  opts: DocxBuildInput,
): Promise<Blob> {
  const date = opts.fields.date || "";
  const member = opts.fields.memberName || "Member";
  const steward = opts.fields.stewardName || "";
  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({ text: date, font: bodyFace(opts), size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Dear ${member},`,
          font: bodyFace(opts),
          size: 22,
        }),
      ],
    }),
    ...bodyParagraphs(opts.fields.body || "", bodyFace(opts)),
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: "In solidarity,",
          font: bodyFace(opts),
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: steward,
          bold: true,
          font: bodyFace(opts),
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Steward · ${opts.localLabel}`,
          color: "666666",
          font: bodyFace(opts),
          size: 18,
        }),
      ],
    }),
  ];

  return Packer.toBlob(baseDocument(opts, children));
}

export async function buildWelcomeLetterDocx(
  opts: DocxBuildInput,
): Promise<Blob> {
  const date = opts.fields.date || "";
  const member = opts.fields.memberName || "Member";
  const collection = opts.fields.collection || "";
  const president = opts.fields.presidentName || "";
  const stewardContact = opts.fields.stewardContact || "";
  const membershipUrl = opts.fields.membershipUrl?.trim() || "";

  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({ text: date, font: bodyFace(opts), size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Dear ${member},`,
          font: bodyFace(opts),
          size: 22,
        }),
      ],
    }),
    ...(collection
      ? [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: collection,
                italics: true,
                color: "555555",
                font: bodyFace(opts),
                size: 20,
              }),
            ],
          }),
        ]
      : []),
    ...bodyParagraphs(opts.fields.body || "", bodyFace(opts)),
    ...(membershipUrl
      ? [
          new Paragraph({
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({
                text: "Membership application / update:",
                bold: true,
                font: bodyFace(opts),
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: membershipUrl,
                color: hexNoHash(opts.palette.primary),
                font: bodyFace(opts),
                size: 20,
              }),
            ],
          }),
        ]
      : []),
    ...(stewardContact
      ? [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Questions? Contact your steward: ${stewardContact}`,
                font: bodyFace(opts),
                size: 20,
                color: "555555",
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: "In solidarity,",
          font: bodyFace(opts),
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: president,
          bold: true,
          font: bodyFace(opts),
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Local president · ${opts.localLabel}`,
          color: "666666",
          font: bodyFace(opts),
          size: 18,
        }),
      ],
    }),
  ];

  return Packer.toBlob(baseDocument(opts, children));
}

export async function buildLetterheadDocx(
  opts: DocxBuildInput,
): Promise<Blob> {
  const body = opts.fields.body?.trim();
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: "Correspondence",
          bold: true,
          font: headlineFace(opts),
          size: 32,
          color: hexNoHash(opts.palette.secondary),
        }),
      ],
    }),
    ...(body
      ? bodyParagraphs(body, bodyFace(opts))
      : [
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: " ",
                font: bodyFace(opts),
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: "CCCCCC",
                space: 1,
              },
            },
            children: [],
          }),
          new Paragraph({
            spacing: { after: 120 },
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: "CCCCCC",
                space: 1,
              },
            },
            children: [],
          }),
          new Paragraph({
            spacing: { after: 120 },
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: "CCCCCC",
                space: 1,
              },
            },
            children: [],
          }),
        ]),
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: opts.localLabel,
          color: "666666",
          font: bodyFace(opts),
          size: 18,
        }),
      ],
    }),
  ];

  return Packer.toBlob(baseDocument(opts, children));
}

export async function buildEventNoticeDocx(
  opts: DocxBuildInput,
): Promise<Blob> {
  const primary = hexNoHash(opts.palette.primary);
  const ink = hexNoHash(pickContrastingInk(opts.palette.primary));
  const title = opts.fields.title || "Event";
  const subtitle = opts.fields.subtitle || "";
  const when = [opts.fields.date, opts.fields.time].filter(Boolean).join("  ·  ");
  const where = opts.fields.location || "";

  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          font: headlineFace(opts),
          size: 48,
          color: hexNoHash(opts.palette.secondary),
        }),
      ],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            spacing: { after: 280 },
            children: [
              new TextRun({
                text: subtitle,
                font: bodyFace(opts),
                size: 26,
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: primary },
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({
          text: "  When  ",
          bold: true,
          color: ink,
          font: bodyFace(opts),
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: when || "TBD",
          bold: true,
          font: bodyFace(opts),
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: primary },
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "  Where  ",
          bold: true,
          color: ink,
          font: bodyFace(opts),
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: where || "TBD",
          bold: true,
          font: bodyFace(opts),
          size: 24,
        }),
      ],
    }),
    ...bodyParagraphs(opts.fields.body || "", bodyFace(opts)),
    new Paragraph({
      spacing: { before: 200 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: opts.fields.contactName
            ? `Questions: ${opts.fields.contactName}`
            : "",
          color: "666666",
          font: bodyFace(opts),
          size: 18,
        }),
      ],
    }),
  ];

  return Packer.toBlob(baseDocument(opts, children));
}
