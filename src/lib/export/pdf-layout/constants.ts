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
export const WORKSHEET_FLOW_FOOTER_GAP = 18;
/** Gap between logo bottom and title baseline on worksheets (pt). */
export const WORKSHEET_MARK_TITLE_GAP = 12;
/** Gap between logo bottom and title baseline on checklist/notes (pt). */
export const CHECKLIST_MARK_TITLE_GAP = 14;
/** Space between worksheet sections (pt). */
export const WORKSHEET_SECTION_GAP = 5;
/** Column gutter for fieldPair / checkPair side-by-side layout (pt). */
export const WORKSHEET_PAIR_COL_GAP = 22;
/** Horizontal inset inside each pair column so text never touches the gutter (pt). */
export const WORKSHEET_FIELD_TEXT_INSET = 4;
/** Vertical gap after a fieldPair / checkPair row (pt). */
export const WORKSHEET_PAIR_ROW_GAP = 4;
/** Min space between body end and footer band in flow mode (pt). */
export const WORKSHEET_PRE_FOOTER_GAP = 10;

/** Compact worksheet header rhythm (pt). */
export const WORKSHEET_HEADER_TITLE_SIZE = 12;
export const WORKSHEET_HEADER_RULE_GAP_AFTER_TITLE = 6;
export const WORKSHEET_HEADER_RULE_GAP_AFTER_RULE = 12;
export const WORKSHEET_HEADER_BODY_GAP = 6;

/** Checklist / notes header rhythm (pt) — larger title, tighter rule placement. */
export const CHECKLIST_HEADER_TITLE_SIZE = 16;
export const CHECKLIST_HEADER_RULE_GAP = 16;
export const CHECKLIST_HEADER_RULE_GAP_AFTER_TITLE = 0;
export const CHECKLIST_HEADER_RULE_GAP_AFTER_RULE = CHECKLIST_HEADER_RULE_GAP - 4;

/** Worksheet field / checkbox typography (pt) — shared by render + budget measure. */
export const WORKSHEET_FIELD_FONT_SIZE = 8.5;
export const WORKSHEET_FIELD_LINE_GAP = 1;
/** Vertical gap after a field rule before the next block (pt). */
export const WORKSHEET_FIELD_RULE_TRAILING = 8;
/** Space between label baseline and the rule beneath it (pt). */
export const WORKSHEET_FIELD_RULE_OFFSET = 4;
/** Leading space before a field / checkbox block starts (pt). */
export const WORKSHEET_FIELD_BLOCK_LEADING = 6;
/** Gap after plain text / intro lines before the next primitive (pt). */
export const WORKSHEET_LINE_AFTER_TEXT_GAP = 4;
/** Leading space before the first ruled writing line (pt). */
export const WORKSHEET_RULED_BLOCK_LEADING = 5;
/** Extra space at the bottom of a ruled block (pt). */
export const WORKSHEET_RULED_BLOCK_TRAILING = 4;
export const WORKSHEET_CHECK_FONT_SIZE = 8;
export const WORKSHEET_CHECK_ROW_HEIGHT = 10;
export const WORKSHEET_CHECK_ROW_TRAILING = 2;

/** Letter page size (pt) — budget API without a live jsPDF instance. */
export const LETTER_PAGE_HEIGHT_PT = 792;
export const LETTER_PAGE_WIDTH_PT = 612;

export const HEADLINE_FACE = "UnionOpsHeadline";
export const BODY_FACE = "UnionOpsBody";
