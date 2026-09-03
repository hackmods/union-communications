import {
  LETTER_PAGE_HEIGHT_PT,
  WORKSHEET_MARGIN_DEFAULT,
} from "./constants";
import {
  computeWorksheetZones,
  createStaticTextMeasurer,
  measureWorksheetLine,
} from "./worksheet-measure";
import { resolveWorksheetLayoutMode, validateWorksheetLayout } from "./worksheet-validate";
import type { WorksheetLayoutInput } from "./worksheet-types";

export type WorksheetLayoutBudget = {
  fitsOnePage: boolean;
  layoutMode: ReturnType<typeof resolveWorksheetLayoutMode>;
  zoneHeights: ReturnType<typeof computeWorksheetZones>;
  suggestedDraftRows: number | null;
  warnings: string[];
  errors: string[];
  ok: boolean;
};

/**
 * Pre-render layout budget for a worksheet template.
 * Use in dev/tests to catch overflow before stewards download a broken handout.
 */
export function layoutWorksheet(input: WorksheetLayoutInput & { footer: string }): WorksheetLayoutBudget {
  const validation = validateWorksheetLayout(input);
  const margin = input.margin ?? WORKSHEET_MARGIN_DEFAULT;
  const pageWidth = 612;
  const contentWidth = pageWidth - margin * 2;
  const measurer = createStaticTextMeasurer(contentWidth);
  const layoutMode = validation.layoutMode;

  const zoneHeights = computeWorksheetZones({
    measurer,
    margin,
    layoutMode,
    header: {
      title: input.title,
      subtitle: input.subtitle,
      instructions: input.instructions,
    },
    sections: input.sections,
    closingSections: input.closingSections,
    footer: {
      footer: input.footer,
      reminder: input.reminder,
      tips: input.tips,
    },
  });

  const warnings = [...validation.warnings];
  const errors = [...validation.errors];

  let suggestedDraftRows: number | null = null;
  const fillLine = input.sections
    .flatMap((s) => s.lines)
    .find((l) => l.kind === "ruled" && l.fill);

  if (fillLine && fillLine.kind === "ruled" && fillLine.fill) {
    const rowHeight = fillLine.rowHeight ?? 20;
    const available =
      zoneHeights.contentBottom - zoneHeights.header - zoneHeights.body + (fillLine.minRows ?? 6) * rowHeight;
    const maxFit = Math.floor(Math.max(0, available) / rowHeight);
    suggestedDraftRows = Math.min(maxFit, fillLine.maxRows ?? maxFit);
    if (fillLine.maxRows !== undefined && suggestedDraftRows > fillLine.maxRows) {
      suggestedDraftRows = fillLine.maxRows;
    }
    if (suggestedDraftRows < (fillLine.minRows ?? 6)) {
      warnings.push(
        `fill block needs at least ${fillLine.minRows ?? 6} rows but only ~${suggestedDraftRows} fit above footer.`,
      );
    }
  }

  const usableBody = zoneHeights.contentBottom - zoneHeights.header;
  if (zoneHeights.body > usableBody && !input.allowMultiPage) {
    warnings.push(
      `Body height (~${Math.round(zoneHeights.body)}pt) exceeds usable space (~${Math.round(usableBody)}pt) — content may clip on one page.`,
    );
  }

  if (zoneHeights.total > LETTER_PAGE_HEIGHT_PT - margin * 2 && !input.allowMultiPage) {
    warnings.push("Total measured height exceeds one letter page — enable allowMultiPage or reduce sections.");
  }

  const fitsOnePage =
    input.allowMultiPage === true ||
    (zoneHeights.header + zoneHeights.body + zoneHeights.closing + zoneHeights.footer <=
      LETTER_PAGE_HEIGHT_PT - margin * 2 &&
      zoneHeights.body <= usableBody);

  return {
    fitsOnePage,
    layoutMode,
    zoneHeights,
    suggestedDraftRows,
    warnings,
    errors,
    ok: validation.ok && fitsOnePage,
  };
}

/** Count ruled rows that would render for a line at a given Y budget (static estimate). */
export function estimateRuledRowCount(
  line: Extract<import("./worksheet-types").WorksheetLine, { kind: "ruled" }>,
  availableHeight: number,
): number {
  const rowHeight = line.rowHeight ?? 20;
  if (!line.fill) return line.count ?? 0;
  let count = Math.max(line.minRows ?? 6, Math.floor(availableHeight / rowHeight));
  if (line.maxRows !== undefined) count = Math.min(count, line.maxRows);
  return count;
}

export { measureWorksheetLine };
