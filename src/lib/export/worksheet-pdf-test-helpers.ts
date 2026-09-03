/**
 * Shared pdf.js helpers for worksheet PDF unit tests.
 * Not imported by production code.
 */

import {
  WORKSHEET_MIN_LABEL_GAP,
  worksheetPairColumnBounds,
} from "@/lib/export/pdf-layout/constants";

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
};

export type ParsedWorksheetPdf = {
  numPages: number;
  joined: string;
  items: PdfTextItem[];
  yByExact: Map<string, number>;
  page: {
    getOperatorList: () => Promise<{ fnArray: number[] }>;
    getTextContent: () => Promise<{ items: unknown[] }>;
  };
};

export async function parseWorksheetPdfBlob(blob: Blob): Promise<ParsedWorksheetPdf> {
  const data = new Uint8Array(await blob.arrayBuffer());
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const text = await page.getTextContent();
  const items: PdfTextItem[] = [];
  const yByExact = new Map<string, number>();

  for (const raw of text.items) {
    if (!("str" in raw) || typeof raw.str !== "string") continue;
    const x = raw.transform?.[4] ?? 0;
    const y = raw.transform?.[5] ?? 0;
    items.push({ str: raw.str, x, y });
    const trimmed = raw.str.trim();
    if (trimmed) yByExact.set(trimmed, y);
  }

  const joined = items.map((item) => item.str).join(" ");

  return {
    numPages: doc.numPages,
    joined,
    items,
    yByExact,
    page,
  };
}

/** Count horizontal rule strokes (field underlines + ruled rows + accent). */
export async function countWorksheetStrokeOps(
  page: ParsedWorksheetPdf["page"],
): Promise<number> {
  const ops = await page.getOperatorList();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OPS = (await import("pdfjs-dist/legacy/build/pdf.mjs") as any).OPS ?? {};
  return ops.fnArray.filter((fn: number) => {
    const name = Object.entries(OPS).find(([, v]) => v === fn)?.[0] ?? "";
    return /constructPath|stroke/i.test(name);
  }).length;
}

/** First item whose text includes `snippet` (case-sensitive substring). */
export function findTextY(
  parsed: ParsedWorksheetPdf,
  snippet: string,
): number | undefined {
  for (const item of parsed.items) {
    if (item.str.includes(snippet)) return item.y;
  }
  return undefined;
}

/** All items whose text includes `snippet`. */
export function findTextItems(
  parsed: ParsedWorksheetPdf,
  snippet: string,
): PdfTextItem[] {
  return parsed.items.filter((item) => item.str.includes(snippet));
}

/**
 * Assert row-mode fieldPair/checkPair uses both columns (not stacked on the left).
 * Thresholds derive from letter page + default worksheet margins.
 */
export function expectPairUsesRowColumns(
  parsed: ParsedWorksheetPdf,
  leftSnippet: string,
  rightSnippet: string,
  bounds = worksheetPairColumnBounds(),
): void {
  const leftItems = findTextItems(parsed, leftSnippet);
  const rightItems = findTextItems(parsed, rightSnippet);
  if (leftItems.length === 0 || rightItems.length === 0) {
    throw new Error(
      `Missing pair snippet for column check: ${leftSnippet} / ${rightSnippet}`,
    );
  }
  const leftX = leftItems[0]!.x;
  const rightX = rightItems[0]!.x;
  if (leftX > bounds.leftMaxX) {
    throw new Error(
      `Left pair column too far right (x=${leftX}) — expected row layout, got stack?`,
    );
  }
  if (rightX < bounds.rightMinX) {
    throw new Error(
      `Right pair column too far left (x=${rightX}) — expected row layout, got stack?`,
    );
  }
}

/**
 * Assert minimum breathable gap between consecutive field/check labels.
 * Default minGap matches engine rule trailing + block leading.
 */
export function expectMinFieldBlockGap(
  parsed: ParsedWorksheetPdf,
  upperSnippet: string,
  lowerSnippet: string,
  minGap = WORKSHEET_MIN_LABEL_GAP,
): void {
  expectMinVerticalGap(parsed, upperSnippet, lowerSnippet, minGap);
}

/**
 * Assert headings appear top-to-bottom in reading order.
 * PDF y increases upward — first heading should have the highest y.
 */
export function expectHeadingOrder(
  parsed: ParsedWorksheetPdf,
  headings: string[],
): void {
  const ys = headings.map((heading) => {
    const y = findTextY(parsed, heading);
    if (y === undefined) {
      throw new Error(`Missing heading snippet: ${heading}`);
    }
    return y;
  });

  for (let i = 1; i < ys.length; i++) {
    if (ys[i]! >= ys[i - 1]!) {
      throw new Error(
        `Headings out of order: "${headings[i - 1]}" (y=${ys[i - 1]}) should sit above "${headings[i]}" (y=${ys[i]})`,
      );
    }
  }
}

/** Assert block snippets appear top-to-bottom in reading order. */
export function expectBlockOrder(
  parsed: ParsedWorksheetPdf,
  snippets: string[],
): void {
  expectHeadingOrder(parsed, snippets);
}

/** Footer band: tips heading → bullets → reminder → disclaimer. */
export function expectFooterBandOrder(
  parsed: ParsedWorksheetPdf,
  opts: {
    tipsHeading: string;
    firstBullet: string;
    reminder: string;
    disclaimer: string;
  },
): void {
  const tipsY = findTextY(parsed, opts.tipsHeading);
  const bulletY = findTextY(parsed, opts.firstBullet);
  const reminderY = findTextY(parsed, opts.reminder);
  const footerY = findTextY(parsed, opts.disclaimer);
  if (tipsY === undefined || bulletY === undefined || reminderY === undefined || footerY === undefined) {
    throw new Error("Missing footer band snippet for order check");
  }
  if (tipsY <= bulletY || bulletY <= reminderY || reminderY <= footerY) {
    throw new Error(
      `Footer band out of order: tips=${tipsY} bullet=${bulletY} reminder=${reminderY} footer=${footerY}`,
    );
  }
}

/** Minimum vertical gap between two snippets (pdf.js Y difference). */
export function expectMinVerticalGap(
  parsed: ParsedWorksheetPdf,
  upperSnippet: string,
  lowerSnippet: string,
  minGap: number,
): void {
  const upperY = findTextY(parsed, upperSnippet);
  const lowerY = findTextY(parsed, lowerSnippet);
  if (upperY === undefined || lowerY === undefined) {
    throw new Error(`Missing snippet for gap check: ${upperSnippet} / ${lowerSnippet}`);
  }
  if (upperY - lowerY < minGap) {
    throw new Error(
      `Gap too small between "${upperSnippet}" and "${lowerSnippet}": ${upperY - lowerY} < ${minGap}`,
    );
  }
}

/** True when pdf.js operator list includes an embedded image (platform mark). */
export async function pdfHasEmbeddedMark(
  page: ParsedWorksheetPdf["page"],
): Promise<boolean> {
  const ops = await page.getOperatorList();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OPS = (await import("pdfjs-dist/legacy/build/pdf.mjs") as any).OPS ?? {};
  return ops.fnArray.some((fn: number) => {
    const name = Object.entries(OPS).find(([, v]) => v === fn)?.[0] ?? "";
    return /paintImage/i.test(name);
  });
}
