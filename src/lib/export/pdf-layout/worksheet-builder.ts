import type { WorksheetLayoutMode } from "./types";
import type { WorksheetLine, WorksheetSection } from "./worksheet-types";

type BuiltWorksheet = {
  title: string;
  subtitle?: string;
  instructions?: string;
  sections: WorksheetSection[];
  closingSections?: WorksheetSection[];
  tips?: { heading: string; lines: readonly string[] };
  reminder?: string;
  layoutMode?: WorksheetLayoutMode;
  allowMultiPage?: boolean;
  margin?: number;
};

/** Fluent builder for worksheet PDF templates. */
export class WorksheetBuilder {
  private state: BuiltWorksheet;

  private constructor(title: string) {
    this.state = { title, sections: [] };
  }

  static create(title: string): WorksheetBuilder {
    return new WorksheetBuilder(title);
  }

  subtitle(text: string): this {
    this.state.subtitle = text;
    return this;
  }

  instructions(text: string): this {
    this.state.instructions = text;
    return this;
  }

  layoutMode(mode: WorksheetLayoutMode): this {
    this.state.layoutMode = mode;
    return this;
  }

  allowMultiPage(value = true): this {
    this.state.allowMultiPage = value;
    return this;
  }

  margin(pt: number): this {
    this.state.margin = pt;
    return this;
  }

  tips(heading: string, lines: readonly string[]): this {
    this.state.tips = { heading, lines };
    return this;
  }

  reminder(text: string): this {
    this.state.reminder = text;
    return this;
  }

  section(heading: string, lines: WorksheetLine[], intro?: string): this {
    this.state.sections.push({ heading, lines, intro });
    return this;
  }

  closingSection(heading: string, lines: WorksheetLine[], intro?: string): this {
    if (!this.state.closingSections) this.state.closingSections = [];
    this.state.closingSections.push({ heading, lines, intro });
    return this;
  }

  build(): BuiltWorksheet {
    return { ...this.state, sections: [...this.state.sections] };
  }
}

/** Shorthand helpers for common line types. */
export const wsLine = {
  text: (text: string): WorksheetLine => ({ kind: "text", text }),
  field: (label: string): WorksheetLine => ({ kind: "field", label }),
  fieldPair: (left: string, right: string): WorksheetLine => ({
    kind: "fieldPair",
    left: { label: left },
    right: { label: right },
  }),
  ruled: (count: number, rowHeight?: number): WorksheetLine => ({
    kind: "ruled",
    count,
    rowHeight,
  }),
  ruledFill: (opts: { minRows?: number; maxRows?: number; rowHeight?: number }): WorksheetLine => ({
    kind: "ruled",
    fill: true,
    ...opts,
  }),
  check: (text: string): WorksheetLine => ({ kind: "check", text }),
  checkPair: (left: string, right: string): WorksheetLine => ({
    kind: "checkPair",
    left,
    right,
  }),
  table: (headers: readonly string[], rows: number, rowHeight?: number): WorksheetLine => ({
    kind: "table",
    headers,
    rows,
    rowHeight,
  }),
  columns: (...columnLines: WorksheetLine[][]): WorksheetLine => ({
    kind: "columnLayout",
    columns: columnLines.map((lines) => ({ lines })),
  }),
  pageBreak: (): WorksheetLine => ({ kind: "pageBreak" }),
};

export function buildWorksheet(title: string): WorksheetBuilder {
  return WorksheetBuilder.create(title);
}
