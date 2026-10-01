import { describe, expect, it } from "vitest";
import {
  AXE_SUITE_PRESETS,
  DEFAULT_AXE_SUITE,
  buildAxeRunOptions,
  normalizeAxeResults,
  resolveAxeSuiteId,
  summarizeAxeFindings,
} from "./viewport-lab-axe";

describe("viewport-lab-axe suites", () => {
  it("defaults to WCAG 2.2 AA cumulative tags", () => {
    expect(DEFAULT_AXE_SUITE).toBe("wcag22aa");
    const opts = buildAxeRunOptions({});
    expect(opts.runOnly).toEqual({
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    });
  });

  it("omits runOnly for all-enabled suite", () => {
    const opts = buildAxeRunOptions({ suite: "all" });
    expect(opts.runOnly).toBeUndefined();
  });

  it("scopes experimental and best-practice tags", () => {
    expect(buildAxeRunOptions({ suite: "experimental" }).runOnly).toEqual({
      type: "tag",
      values: ["experimental"],
    });
    expect(buildAxeRunOptions({ suite: "best-practice" }).runOnly).toEqual({
      type: "tag",
      values: ["best-practice"],
    });
  });

  it("disables color-contrast unless opted in", () => {
    expect(buildAxeRunOptions({ colorContrast: false }).rules).toEqual({
      "color-contrast": { enabled: false },
    });
    expect(
      buildAxeRunOptions({ colorContrast: true }).rules,
    ).toBeUndefined();
  });

  it("includes incomplete result type by default", () => {
    expect(buildAxeRunOptions({}).resultTypes).toEqual([
      "violations",
      "incomplete",
    ]);
    expect(
      buildAxeRunOptions({ includeIncomplete: false }).resultTypes,
    ).toEqual(["violations"]);
  });

  it("always requests selectors ancestry and iframes", () => {
    const opts = buildAxeRunOptions({ suite: "wcag2aa" });
    expect(opts.iframes).toBe(true);
    expect(opts.selectors).toBe(true);
    expect(opts.ancestry).toBe(true);
  });

  it("exposes every suite preset id", () => {
    expect(AXE_SUITE_PRESETS.map((p) => p.id)).toEqual([
      "wcag22aa",
      "wcag21aa",
      "wcag2aa",
      "best-practice",
      "experimental",
      "all",
    ]);
    expect(resolveAxeSuiteId("nope")).toBe("wcag22aa");
  });
});

describe("normalizeAxeResults", () => {
  const sample = {
    testEngine: { name: "axe-core", version: "4.13.0" },
    violations: [
      {
        id: "button-name",
        impact: "critical",
        help: "Buttons must have discernible text",
        description: "Ensures buttons have discernible text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.13/button-name",
        tags: ["wcag2a", "wcag412"],
        nodes: [{ target: ["#go"] }, { target: [".cta"] }],
      },
      {
        id: "color-contrast",
        impact: "serious",
        help: "Elements must have sufficient color contrast",
        description: "contrast",
        helpUrl: "https://example.com/contrast",
        tags: ["wcag2aa", "wcag143"],
        nodes: [{ target: [".muted"] }],
      },
      {
        id: "region",
        impact: "moderate",
        help: "All page content should be contained by landmarks",
        description: "landmarks",
        helpUrl: "https://example.com/region",
        tags: ["best-practice"],
        nodes: [{ target: ["body"] }],
      },
    ],
    incomplete: [
      {
        id: "color-contrast",
        impact: "serious",
        help: "Elements must have sufficient color contrast",
        description: "needs review",
        helpUrl: "https://example.com/contrast",
        tags: ["wcag2aa"],
        nodes: [{ target: [".overlay"] }],
      },
      {
        id: "hidden-content",
        impact: "minor",
        help: "Hidden content",
        description: "review",
        helpUrl: "https://example.com/hidden",
        tags: ["experimental"],
        nodes: [{ target: [".sr"] }],
      },
    ],
  };

  it("maps targets tags helpUrl and kinds", () => {
    const normalized = normalizeAxeResults(sample, { impact: "all" });
    expect(normalized.axeVersion).toBe("4.13.0");
    expect(normalized.violations).toHaveLength(3);
    expect(normalized.incomplete).toHaveLength(2);
    expect(normalized.findings).toHaveLength(5);
    const button = normalized.violations[0];
    expect(button).toMatchObject({
      id: "button-name",
      kind: "violation",
      nodes: 2,
      targets: ["#go", ".cta"],
      helpUrl: expect.stringContaining("button-name"),
    });
    expect(button.tags).toContain("wcag2a");
    expect(normalized.incomplete[0].kind).toBe("incomplete");
  });

  it("filters to serious and critical when impact is serious", () => {
    const normalized = normalizeAxeResults(sample, { impact: "serious" });
    expect(normalized.violations.map((v) => v.id)).toEqual([
      "button-name",
      "color-contrast",
    ]);
    expect(normalized.incomplete.map((v) => v.id)).toEqual(["color-contrast"]);
    expect(normalized.findings.every((f) => f.impact === "critical" || f.impact === "serious")).toBe(
      true,
    );
  });

  it("summarizes counts by impact and kind", () => {
    const { findings } = normalizeAxeResults(sample, { impact: "all" });
    expect(summarizeAxeFindings(findings)).toEqual({
      critical: 1,
      serious: 2,
      moderate: 1,
      minor: 1,
      incomplete: 2,
      violations: 3,
    });
  });
});
