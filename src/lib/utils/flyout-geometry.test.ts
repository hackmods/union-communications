import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GUIDES_MENU_WIDTH_PX,
  HUB_TOOLS_MENU_WIDTH_PX,
  NAV_MEGA_MENU,
  NAV_MEGA_MENU_GRID_CLASS,
  TOOLS_MEGA_MENU,
  clampFlyoutToViewport,
  flyoutBoxFitsViewport,
  navMegaMenuColumnCount,
  preferredGuidesMenuWidth,
  preferredHubToolsMenuWidth,
  preferredToolsMegaMenuWidth,
} from "./flyout-geometry";

const srcRoot = join(__dirname, "../..");

/** Desktop widths where Tools ▾ is a flyout (nav is `lg:flex`). */
const MEDIUM_DESKTOPS = [1024, 1280, 1366, 1440] as const;
const ALL_DESKTOPS = [...MEDIUM_DESKTOPS, 1536, 1920] as const;

/**
 * Tools ▾ sits in the center nav, before Display / Lang on the right.
 * Matches Header: logo | nav (… Tools, Auth) | display+lang, chrome padding.
 */
function typicalToolsTrigger(viewportWidth: number) {
  const pad = viewportWidth >= 1280 ? 32 : 24;
  const rightCluster = 196;
  const authInNav = 108;
  const toolsWidth = 72;
  const right = viewportWidth - pad - rightCluster - authInNav;
  return { left: right - toolsWidth, right, bottom: 56 };
}

/** Pessimistic: trigger further left (cramped lg nav / extra auth chrome). */
function leftishToolsTrigger() {
  return { left: 360, right: 432, bottom: 56 };
}

function typicalGuidesTrigger(viewportWidth: number) {
  const pad = viewportWidth >= 1280 ? 32 : 24;
  return { left: pad + 200, right: pad + 280, bottom: 56 };
}

function place(
  viewportWidth: number,
  trigger: { left: number; right: number; bottom: number },
  preferredWidth = preferredToolsMegaMenuWidth(viewportWidth),
  viewportHeight = 768,
  align: "left" | "right" = "right",
) {
  return clampFlyoutToViewport({
    viewportWidth,
    viewportHeight,
    trigger,
    preferredWidth,
    align,
  });
}

describe("preferredToolsMegaMenuWidth", () => {
  it("keeps lg/xl panels 2-col compact, 4-col only at 2xl", () => {
    expect(preferredToolsMegaMenuWidth(1024)).toBe(28 * 16);
    expect(preferredToolsMegaMenuWidth(1279)).toBe(28 * 16);
    expect(preferredToolsMegaMenuWidth(1280)).toBe(36 * 16);
    expect(preferredToolsMegaMenuWidth(1535)).toBe(36 * 16);
    expect(preferredToolsMegaMenuWidth(1536)).toBe(52 * 16);
    expect(navMegaMenuColumnCount(1024)).toBe(2);
    expect(navMegaMenuColumnCount(1440)).toBe(2);
    expect(navMegaMenuColumnCount(1536)).toBe(4);
  });

  it("never prefers a width wider than a medium desktop minus gutters", () => {
    for (const vw of MEDIUM_DESKTOPS) {
      const width = preferredToolsMegaMenuWidth(vw);
      expect(width).toBeLessThanOrEqual(vw - NAV_MEGA_MENU.gutterPx * 2);
    }
  });
});

describe("preferredGuidesMenuWidth", () => {
  it("matches the Tools mega stepped widths", () => {
    for (const vw of ALL_DESKTOPS) {
      expect(preferredGuidesMenuWidth(vw)).toBe(preferredToolsMegaMenuWidth(vw));
    }
  });

  it("keeps the Guides mega-menu on-screen when left-aligned", () => {
    for (const vw of ALL_DESKTOPS) {
      const trigger = typicalGuidesTrigger(vw);
      const box = place(
        vw,
        trigger,
        preferredGuidesMenuWidth(vw),
        768,
        "left",
      );
      expect(
        flyoutBoxFitsViewport(box, vw, 768),
        `${vw}px Guides → ${JSON.stringify(box)}`,
      ).toBe(true);
    }
  });
});

describe("clampFlyoutToViewport", () => {
  it("keeps the Tools mega-menu on-screen at every desktop width", () => {
    for (const vw of ALL_DESKTOPS) {
      for (const trigger of [typicalToolsTrigger(vw), leftishToolsTrigger()]) {
        const box = place(vw, trigger);
        expect(
          flyoutBoxFitsViewport(box, vw, 768),
          `${vw}px trigger.right=${trigger.right} → ${JSON.stringify(box)}`,
        ).toBe(true);
      }
    }
  });

  it("clamps the legacy 40/52rem mega-menu so it cannot run off a laptop", () => {
    const legacyWidths = [40 * 16, 52 * 16, Math.round(0.9 * 1280)];
    for (const vw of MEDIUM_DESKTOPS) {
      for (const preferredWidth of legacyWidths) {
        const box = place(vw, typicalToolsTrigger(vw), preferredWidth);
        expect(
          flyoutBoxFitsViewport(box, vw, 768),
          `${vw}px preferred=${preferredWidth}`,
        ).toBe(true);
        expect(box.width).toBeLessThanOrEqual(vw - TOOLS_MEGA_MENU.gutterPx * 2);
      }
    }
  });

  it("right-aligns to the trigger when there is room", () => {
    const vw = 1920;
    const trigger = typicalToolsTrigger(vw);
    const box = place(vw, trigger);
    expect(box.width).toBe(52 * 16);
    expect(box.left).toBe(trigger.right - box.width);
  });

  it("shrinks a right-aligned panel to stay on the trigger instead of parking left", () => {
    const vw = 1024;
    const trigger = leftishToolsTrigger();
    const box = place(vw, trigger, 40 * 16);
    expect(box.left + box.width).toBe(trigger.right);
    expect(box.left).toBeGreaterThanOrEqual(NAV_MEGA_MENU.gutterPx);
  });

  it("caps height so a tall panel cannot extend past the viewport", () => {
    const box = clampFlyoutToViewport({
      viewportWidth: 1280,
      viewportHeight: 700,
      trigger: { left: 900, right: 980, bottom: 56 },
      preferredWidth: 36 * 16,
      align: "right",
    });
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(
      700 - NAV_MEGA_MENU.gutterPx,
    );
    expect(box.maxHeight).toBeLessThanOrEqual(700 * NAV_MEGA_MENU.maxHeightVh);
  });

  it("keeps the Officer tools list under the trigger, not floated left", () => {
    const vw = 1280;
    const trigger = { left: 900, right: 1020, bottom: 104 };
    const box = clampFlyoutToViewport({
      viewportWidth: vw,
      viewportHeight: 700,
      trigger,
      preferredWidth: preferredHubToolsMenuWidth(),
      align: "left",
    });
    expect(box.left).toBe(trigger.left);
    expect(box.width).toBe(HUB_TOOLS_MENU_WIDTH_PX);
    expect(flyoutBoxFitsViewport(box, vw, 700)).toBe(true);
  });
});

describe("Nav mega-menu source stays clamped", () => {
  it("does not hard-set a 90vw/40rem/52rem panel width", () => {
    const source = readFileSync(
      join(srcRoot, "components/layout/nav/MenuContents.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/w-\[min\(90vw/);
    expect(source).not.toMatch(/xl:w-\[min\(90vw/);
    expect(source).toContain("NAV_MEGA_MENU_GRID_CLASS");
  });

  it("wires the header Guides and Tools flyouts through viewport clamp", () => {
    const source = readFileSync(
      join(srcRoot, "components/layout/Header.tsx"),
      "utf8",
    );
    expect(source).toMatch(/preferredPanelWidth=\{preferredToolsMegaMenuWidth\}/);
    expect(source).toMatch(/preferredPanelWidth=\{preferredGuidesMenuWidth\}/);
  });

  it("exposes a Guides fallback width for clamping", () => {
    expect(preferredGuidesMenuWidth(800)).toBe(GUIDES_MENU_WIDTH_PX);
    expect(GUIDES_MENU_WIDTH_PX).toBe(NAV_MEGA_MENU.fallbackWidthPx);
  });

  it("uses 2 columns until 2xl (not xl:grid-cols-4)", () => {
    const tokens = NAV_MEGA_MENU_GRID_CLASS.split(/\s+/);
    expect(tokens).toContain("grid-cols-2");
    expect(tokens).toContain("2xl:grid-cols-4");
    expect(tokens).not.toContain("xl:grid-cols-4");
  });
});
