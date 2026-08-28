import { describe, expect, it } from "vitest";
import { guideTocItems } from "@/lib/comms/guide-toc-items";

describe("guideTocItems", () => {
  it("maps id/key pairs to labelled TOC items", () => {
    const pairs = [
      ["section-a", "alpha"],
      ["section-b", "beta"],
    ] as const;

    expect(
      guideTocItems(pairs, (key) => `label:${key}`),
    ).toEqual([
      { id: "section-a", label: "label:alpha" },
      { id: "section-b", label: "label:beta" },
    ]);
  });
});
