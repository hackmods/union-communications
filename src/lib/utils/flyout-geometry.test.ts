import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FLYOUT_DEFAULTS,
  HUB_TOOLS_MENU_WIDTH_PX,
  clampFlyoutToViewport,
  flyoutBoxFitsViewport,
  preferredHubToolsMenuWidth,
} from "./flyout-geometry";

const srcRoot = join(__dirname, "../..");

describe("clampFlyoutToViewport", () => {
  it("keeps compact flyouts on-screen at desktop widths", () => {
    for (const viewportWidth of [1024, 1280, 1440, 1536]) {
      for (const trigger of [
        { left: 900, right: 980, bottom: 56 },
        { left: 360, right: 432, bottom: 56 },
      ]) {
        const box = clampFlyoutToViewport({
          viewportWidth,
          viewportHeight: 768,
          trigger,
          preferredWidth: 28 * 16,
          align: "right",
        });
        expect(flyoutBoxFitsViewport(box, viewportWidth, 768)).toBe(true);
      }
    }
  });

  it("shrinks to the available trigger edge instead of detaching", () => {
    const trigger = { left: 360, right: 432, bottom: 56 };
    const box = clampFlyoutToViewport({
      viewportWidth: 1024,
      viewportHeight: 768,
      trigger,
      preferredWidth: 52 * 16,
      align: "right",
    });
    expect(box.left + box.width).toBe(trigger.right);
    expect(box.left).toBeGreaterThanOrEqual(FLYOUT_DEFAULTS.gutterPx);
  });

  it("caps the flyout height within the visible viewport", () => {
    const box = clampFlyoutToViewport({
      viewportWidth: 1280,
      viewportHeight: 700,
      trigger: { left: 900, right: 980, bottom: 56 },
      preferredWidth: 36 * 16,
      align: "right",
    });
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(
      700 - FLYOUT_DEFAULTS.gutterPx,
    );
    expect(box.maxHeight).toBeLessThanOrEqual(700 * FLYOUT_DEFAULTS.maxHeightVh);
  });

  it("keeps the authenticated Hub tools list under its trigger", () => {
    const viewportWidth = 1280;
    const trigger = { left: 900, right: 1020, bottom: 104 };
    const box = clampFlyoutToViewport({
      viewportWidth,
      viewportHeight: 700,
      trigger,
      preferredWidth: preferredHubToolsMenuWidth(),
      align: "left",
    });
    expect(box.left).toBe(trigger.left);
    expect(box.width).toBe(HUB_TOOLS_MENU_WIDTH_PX);
    expect(flyoutBoxFitsViewport(box, viewportWidth, 700)).toBe(true);
  });
});

describe("public header uses task-first direct navigation", () => {
  it("links to focused destinations without public flyouts", () => {
    const source = readFileSync(join(srcRoot, "components/layout/Header.tsx"), "utf8");
    expect(source).toContain('href="/start"');
    expect(source).toContain('href="/create"');
    expect(source).toContain('href="/learn"');
    expect(source).toContain('href="/search"');
    expect(source).not.toContain("MenuContents");
    expect(source).not.toContain('from "./nav/NavDropdown"');
  });

  it("uses a responsive three-column maximum for the Create catalog", () => {
    const source = readFileSync(
      join(srcRoot, "components/comms/PublicCatalogExplorer.tsx"),
      "utf8",
    );
    expect(source).toContain("sm:grid-cols-2 xl:grid-cols-3");
    expect(source).not.toContain("grid-cols-5");
  });
});
