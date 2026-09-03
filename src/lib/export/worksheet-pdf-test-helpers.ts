/**
 * Shared pdf.js helpers for worksheet PDF unit tests.
 * Not imported by production code.
 */

export type PdfTextItem = {
  str: string;
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
    const y = raw.transform?.[5] ?? 0;
    items.push({ str: raw.str, y });
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
