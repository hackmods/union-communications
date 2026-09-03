/** Shared constants for guide text PDF layout engine. */

export const GUIDE_PDF_PALETTE = {
  navy: { r: 11, g: 19, b: 43 },
  brand: { r: 194, g: 65, b: 12 },
  brandLight: { r: 251, g: 146, b: 60 },
  teal: { r: 194, g: 65, b: 12 },
  amber: { r: 251, g: 146, b: 60 },
  ink: { r: 15, g: 23, b: 42 },
  muted: { r: 71, g: 85, b: 105 },
} as const;

export type PdfRgb = { r: number; g: number; b: number };

/** Default side margins for fill-in worksheets (pt). */
export const WORKSHEET_MARGIN_DEFAULT = 18;
/** Default ruled-row height when `rowHeight` is omitted (pt). */
export const WORKSHEET_RULE_ROW_DEFAULT = 20;
/** Standard checklist / notes margin (pt). */
export const GUIDE_PDF_MARGIN_DEFAULT = 48;

/** Gap between closing block and footer band (pt). */
export const WORKSHEET_CLOSING_GAP = 2;
/** Gap between flowing body and footer when footer attaches after content (pt). */
export const WORKSHEET_FLOW_FOOTER_GAP = 12;

/** Letter page height (pt) — used by budget API without a live jsPDF instance. */
export const LETTER_PAGE_HEIGHT_PT = 792;
export const LETTER_PAGE_WIDTH_PT = 612;

/** Compact worksheet header after mark (pt). */
export const WORKSHEET_HEADER_TITLE_SIZE = 12;
export const WORKSHEET_HEADER_RULE_GAP = 10;
export const WORKSHEET_HEADER_POST_RULE_GAP = 2;

/** Standard checklist / notes header sizes (pt). */
export const CHECKLIST_HEADER_TITLE_SIZE = 16;
export const CHECKLIST_HEADER_RULE_GAP = 16;

export const HEADLINE_FACE = "UnionOpsHeadline";
export const BODY_FACE = "UnionOpsBody";
