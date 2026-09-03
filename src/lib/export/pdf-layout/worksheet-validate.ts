import type { WorksheetLayoutMode } from "./types";
import type { WorksheetLayoutInput, WorksheetLine, WorksheetSection } from "./worksheet-types";
import {
  LETTER_PAGE_WIDTH_PT,
  WORKSHEET_CHECK_FONT_SIZE,
  WORKSHEET_FIELD_FONT_SIZE,
  WORKSHEET_MARGIN_DEFAULT,
  WORKSHEET_PAIR_COL_GAP,
} from "./constants";
import { createStaticTextMeasurer } from "./worksheet-measure";
import { pairColumnWidth } from "./worksheet-fields";

export type WorksheetLayoutValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  layoutMode: WorksheetLayoutMode;
};

function sectionsHaveFill(sections: WorksheetSection[]): boolean {
  return sections.some((section) =>
    section.lines.some((line) => line.kind === "ruled" && line.fill),
  );
}

function countFillBlocks(sections: WorksheetSection[]): number {
  let count = 0;
  for (const section of sections) {
    for (const line of section.lines) {
      if (line.kind === "ruled" && line.fill) count++;
    }
  }
  return count;
}

function collectFillLines(sections: WorksheetSection[]): WorksheetLine[] {
  const fills: WorksheetLine[] = [];
  for (const section of sections) {
    for (const line of section.lines) {
      if (line.kind === "ruled" && line.fill) fills.push(line);
    }
  }
  return fills;
}

/** Infer layout mode when the caller omits `layoutMode`. */
export function resolveWorksheetLayoutMode(
  input: Pick<WorksheetLayoutInput, "layoutMode" | "closingSections" | "sections">,
): WorksheetLayoutMode {
  if (input.layoutMode) return input.layoutMode;
  if (input.closingSections?.length) return "pinnedClosing";
  if (sectionsHaveFill(input.sections)) return "pinnedFooter";
  return "flow";
}

/** Validate worksheet structure before render or budget. */
export function validateWorksheetLayout(input: WorksheetLayoutInput): WorksheetLayoutValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const layoutMode = resolveWorksheetLayoutMode(input);

  const fillCount = countFillBlocks(input.sections);
  if (fillCount > 1) {
    errors.push("At most one ruled block may use fill: true per worksheet.");
  }

  for (const fill of collectFillLines(input.sections)) {
    if (fill.kind !== "ruled" || !fill.fill) continue;
    if (fill.maxRows === undefined) {
      warnings.push(
        "ruled fill block has no maxRows — draft rows may dominate the page. Set maxRows or use a fixed count.",
      );
    }
  }

  if (layoutMode === "flow" && input.closingSections?.length) {
    errors.push(
      "closingSections requires layoutMode pinnedClosing (or omit layoutMode when using closingSections).",
    );
  }

  if (layoutMode === "pinnedClosing" && !input.closingSections?.length) {
    errors.push("layoutMode pinnedClosing requires closingSections.");
  }

  if (layoutMode === "pinnedFooter" && fillCount === 0) {
    warnings.push(
      "layoutMode pinnedFooter is usually paired with a ruled fill block — footer will pin without expanding draft rows.",
    );
  }

  for (const section of [...input.sections, ...(input.closingSections ?? [])]) {
    for (const line of section.lines) {
      if (line.kind === "columnLayout") {
        if (line.columns.length < 2 || line.columns.length > 3) {
          errors.push("columnLayout supports 2–3 columns only.");
        }
      }
      if (line.kind === "table" && line.headers.length === 0) {
        errors.push("table requires at least one header cell.");
      }
    }
  }

  if (!input.allowMultiPage) {
    const pageBreaks = countPageBreaks(input.sections, input.closingSections);
    if (pageBreaks > 0) {
      warnings.push(
        "pageBreak lines present but allowMultiPage is false — breaks are ignored on one-page worksheets.",
      );
    }
  }

  warnUnnecessaryStackPairs(
    [...input.sections, ...(input.closingSections ?? [])],
    warnings,
    input.margin,
  );

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    layoutMode,
  };
}

function countPageBreaks(
  sections: WorksheetSection[],
  closing?: WorksheetSection[],
): number {
  let n = 0;
  for (const section of [...sections, ...(closing ?? [])]) {
    for (const line of section.lines) {
      if (line.kind === "pageBreak") n++;
    }
  }
  return n;
}

function warnUnnecessaryStackPairs(
  sections: WorksheetSection[],
  warnings: string[],
  margin = WORKSHEET_MARGIN_DEFAULT,
): void {
  const contentWidth = LETTER_PAGE_WIDTH_PT - margin * 2;
  const colW = pairColumnWidth(contentWidth, WORKSHEET_PAIR_COL_GAP);
  const measurer = createStaticTextMeasurer(contentWidth);

  for (const section of sections) {
    for (const line of section.lines) {
      if (line.kind !== "fieldPair" && line.kind !== "checkPair") continue;
      if (line.layout !== "stack") continue;

      if (line.kind === "fieldPair") {
        const leftLines = measurer.wrappedLineCount(
          line.left.label,
          WORKSHEET_FIELD_FONT_SIZE,
          colW,
        );
        const rightLines = measurer.wrappedLineCount(
          line.right.label,
          WORKSHEET_FIELD_FONT_SIZE,
          colW,
        );
        if (leftLines === 1 && rightLines === 1) {
          warnings.push(
            `fieldPair in "${section.heading}" uses layout: "stack" but labels fit side-by-side — omit stack to use page width.`,
          );
        }
        continue;
      }

      if (line.kind === "checkPair") {
        const leftLines = measurer.wrappedLineCount(
          `☐  ${line.left}`,
          WORKSHEET_CHECK_FONT_SIZE,
          colW,
        );
        const rightLines = measurer.wrappedLineCount(
          `☐  ${line.right}`,
          WORKSHEET_CHECK_FONT_SIZE,
          colW,
        );
        if (leftLines === 1 && rightLines === 1) {
          warnings.push(
            `checkPair in "${section.heading}" uses layout: "stack" but labels fit side-by-side — omit stack to use page width.`,
          );
        }
      }
    }
  }
}

export function sectionsHaveFillExport(sections: WorksheetSection[]): boolean {
  return sectionsHaveFill(sections);
}
