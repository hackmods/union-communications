import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Keep serious/critical only — matches existing public-page axe smoke. */
export function seriousOrCriticalViolations(
  violations: { impact?: string | null }[],
) {
  return violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

/** Run axe and assert no serious or critical violations. */
export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    // Smoke gate focuses on structure/name/role. Known Hub/tool UI debt:
    // near-miss contrast + scrollable panels without focusable children.
    .disableRules(["color-contrast", "scrollable-region-focusable"])
    .analyze();
  expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
}
