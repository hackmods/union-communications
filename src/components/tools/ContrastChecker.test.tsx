import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContrastChecker } from "./ContrastChecker";
import { checkContrast, contrastRatio } from "@/lib/utils/contrast";
import { pickContrastingInk } from "@/lib/utils/ink";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { ratio?: string }) => {
    if (key === "pass") return "Passes WCAG AA contrast";
    if (key === "fail") return "Fails WCAG AA contrast - adjust colours for accessibility";
    if (key === "ratio") return `Contrast ratio: ${values?.ratio}:1`;
    return key;
  },
}));

describe("ContrastChecker", () => {
  it("displayed pass/fail matches WCAG AA for canvas ink on brand primaries", () => {
    const pairs: Array<{ fg: string; bg: string }> = [
      // Flyer/Graphic pattern: ink from pickContrastingInk(primary)
      {
        fg: pickContrastingInk("#003DA5"),
        bg: "#003DA5",
      },
      {
        fg: pickContrastingInk("#F5F0E8"),
        bg: "#F5F0E8",
      },
      {
        fg: pickContrastingInk("#FFFFFF"),
        bg: "#FFFFFF",
      },
      // Known fail: light grey on slightly lighter grey
      { fg: "#BBBBBB", bg: "#DDDDDD" },
    ];

    for (const { fg, bg } of pairs) {
      const expected = checkContrast(fg, bg);
      const manual = contrastRatio(fg, bg);
      expect(manual).not.toBeNull();
      expect(expected.ratio).toBeCloseTo(manual!, 5);
      expect(expected.passesAA).toBe(manual! >= 4.5);

      // Hardcoded white disagrees with real canvas ink on light primaries.
      if (bg === "#F5F0E8" || bg === "#FFFFFF") {
        expect(fg).not.toBe("#FFFFFF");
        expect(checkContrast("#FFFFFF", bg).passesAA).toBe(false);
        expect(expected.passesAA).toBe(true);
      }

      const { unmount } = render(
        <ContrastChecker foreground={fg} background={bg} />,
      );
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(
        expected.passesAA
          ? "Passes WCAG AA contrast"
          : "Fails WCAG AA contrast",
      );
      expect(status).toHaveTextContent(
        `Contrast ratio: ${expected.ratio!.toFixed(2)}:1`,
      );
      unmount();
    }
  });
});
