/** Fill-in worksheet line primitives — ruled rows, fields, checks, tables, columns. */
export type WorksheetLine =
  | { kind: "text"; text: string }
  | { kind: "field"; label: string }
  | { kind: "fieldInline"; label: string }
  | { kind: "fieldPair"; left: { label: string }; right: { label: string } }
  | {
      kind: "ruled";
      count?: number;
      rowHeight?: number;
      fill?: boolean;
      minRows?: number;
      maxRows?: number;
    }
  | { kind: "check"; text: string }
  | { kind: "checkPair"; left: string; right: string }
  /** Tabular block with header row + fixed body rows. */
  | {
      kind: "table";
      headers: readonly string[];
      rows: number;
      rowHeight?: number;
    }
  /** Side-by-side columns of worksheet lines (2–3 columns). */
  | {
      kind: "columnLayout";
      columns: readonly { lines: WorksheetLine[] }[];
      gap?: number;
    }
  /** Force a page break before the next section line (multi-page worksheets). */
  | { kind: "pageBreak" };

export type WorksheetSection = {
  heading: string;
  intro?: string;
  lines: WorksheetLine[];
  /** Keep section on one page when possible. */
  pageBreak?: "avoid" | "auto";
};

export type WorksheetLayoutInput = {
  title: string;
  subtitle?: string;
  instructions?: string;
  sections: WorksheetSection[];
  closingSections?: WorksheetSection[];
  tips?: { heading: string; lines: readonly string[] };
  reminder?: string;
  layoutMode?: import("./types").WorksheetLayoutMode;
  allowMultiPage?: boolean;
  margin?: number;
};
