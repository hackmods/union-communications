import { describe, expect, it } from "vitest";
import { expectHeadingOrder, type ParsedWorksheetPdf } from "./worksheet-pdf-test-helpers";

function fakeParsed(items: { str: string; y: number }[]): ParsedWorksheetPdf {
  const yByExact = new Map<string, number>();
  for (const item of items) {
    yByExact.set(item.str, item.y);
  }
  return {
    numPages: 1,
    joined: items.map((item) => item.str).join(" "),
    items,
    yByExact,
    page: { getOperatorList: async () => ({ fnArray: [] }), getTextContent: async () => ({ items: [] }) },
  };
}

describe("worksheet-pdf-test-helpers", () => {
  it("expectHeadingOrder passes when y values descend (top to bottom reading order)", () => {
    const parsed = fakeParsed([
      { str: "Step 1 — Research", y: 700 },
      { str: "Step 2 — Reflect", y: 550 },
      { str: "Step 3 — Draft", y: 400 },
    ]);

    expect(() =>
      expectHeadingOrder(parsed, [
        "Step 1 — Research",
        "Step 2 — Reflect",
        "Step 3 — Draft",
      ]),
    ).not.toThrow();
  });

  it("expectHeadingOrder throws when headings are out of order", () => {
    const parsed = fakeParsed([
      { str: "Step 3 — Draft", y: 700 },
      { str: "Step 1 — Research", y: 550 },
    ]);

    expect(() =>
      expectHeadingOrder(parsed, ["Step 1 — Research", "Step 3 — Draft"]),
    ).toThrow(/out of order/i);
  });
});
