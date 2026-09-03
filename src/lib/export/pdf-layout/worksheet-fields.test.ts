import { describe, expect, it } from "vitest";
import {
  drawCheckPairRow,
  drawFieldPairRow,
  drawLabeledFieldBlock,
  pairColumnWidth,
} from "./worksheet-fields";
import type { JsPdfLike, PdfFontContext } from "./types";

function mockPdf(labelWidths: Record<string, number> = {}) {
  const ops: Array<{ type: string; args: unknown[] }> = [];
  const pdf = {
    internal: { pageSize: { getWidth: () => 612, getHeight: () => 792 } },
    setFont() {},
    setFontSize() {},
    setTextColor() {},
    setDrawColor() {},
    setLineWidth() {},
    text(str: string, x: number, y: number) {
      ops.push({ type: "text", args: [str, x, y] });
    },
    line(x1: number, y1: number, x2: number, y2: number) {
      ops.push({ type: "line", args: [x1, y1, x2, y2] });
    },
    splitTextToSize(text: string, maxWidth: number) {
      const perLine = labelWidths[text] ?? Math.max(24, Math.floor(maxWidth / 6));
      const lines: string[] = [];
      let rest = text;
      while (rest.length > 0) {
        lines.push(rest.slice(0, perLine));
        rest = rest.slice(perLine);
      }
      return lines.length ? lines : [text];
    },
  } as unknown as JsPdfLike;

  const ctx: PdfFontContext = {
    pdf,
    faces: { headline: "helvetica", body: "helvetica" },
  };

  return { pdf, ctx, ops };
}

describe("worksheet-fields", () => {
  it("pairColumnWidth splits content width minus gap", () => {
    expect(pairColumnWidth(400, 16)).toBe(192);
  });

  it("drawLabeledFieldBlock wraps long labels instead of truncating", () => {
    const label =
      "Federation guide (OFL / national / CUPE / other)";
    const { ctx, ops } = mockPdf({ [label]: 28 });
    const endY = drawLabeledFieldBlock(ctx, label, 18, 192, 100);
    const textOps = ops.filter((op) => op.type === "text");
    expect(textOps.length).toBeGreaterThan(1);
    expect(textOps.map((op) => op.args[0]).join(" ")).toContain("CUPE / other");
    expect(endY).toBeGreaterThan(110);
  });

  it("drawFieldPairRow uses the taller wrapped column", () => {
    const left = "Who reads it at the next meeting?";
    const right = "Executive review date";
    const { ctx } = mockPdf();
    const endY = drawFieldPairRow(ctx, left, right, 18, 576, 594, 120, 16);
    expect(endY).toBeGreaterThan(130);
  });

  it("drawCheckPairRow wraps both checkbox columns", () => {
    const left = "Accurate for this territory (not another city)";
    const right = "Speaker can explain every phrase without notes";
    const { ctx, ops } = mockPdf();
    drawCheckPairRow(ctx, left, right, 18, 576, 200, 16);
    const textOps = ops.filter((op) => op.type === "text");
    expect(textOps.length).toBeGreaterThan(2);
    const leftCol = textOps.filter((op) => op.args[1] === 18);
    const rightCol = textOps.filter((op) => op.args[1] === 18 + pairColumnWidth(576, 16) + 16);
    expect(leftCol.length).toBeGreaterThan(0);
    expect(rightCol.length).toBeGreaterThan(0);
  });
});
