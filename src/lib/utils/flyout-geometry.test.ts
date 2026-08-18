import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TOOLS_MEGA_MENU,
  TOOLS_MEGA_MENU_GRID_CLASS,
  clampFlyoutToViewport,
  flyoutBoxFitsViewport,
  preferredToolsMegaMenuWidth,
  toolsMegaMenuColumnCount,
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

function place(
  viewportWidth: number,
  trigger: { left: number; right: number; bottom: number },
  preferredWidth = preferredToolsMegaMenuWidth(viewportWidth),
  viewportHeight = 768,
) {
  return clampFlyoutToViewport({
    viewportWidth,
    viewportHeight,
    trigger,
    preferredWidth,
    align: "right",
  });
}

describe("preferredToolsMegaMenuWidth", () => {
  it("keeps lg/xl panels 2-col compact, 4-col only at 2xl", () => {
    expect(preferredToolsMegaMenuWidth(1024)).toBe(28 * 16);
    expect(preferredToolsMegaMenuWidth(1279)).toBe(28 * 16);
    expect(preferredToolsMegaMenuWidth(1280)).toBe(36 * 16);
    expect(preferredToolsMegaMenuWidth(1535)).toBe(36 * 16);
    expect(preferredToolsMegaMenuWidth(1536)).toBe(52 * 16);
    expect(toolsMegaMenuColumnCount(1024)).toBe(2);
    expect(toolsMegaMenuColumnCount(1440)).toBe(2);
    expect(toolsMegaMenuColumnCount(1536)).toBe(4);
  });

  it("never prefers a width wider than a medium desktop minus gutters", () => {
    for (const vw of MEDIUM_DESKTOPS) {
      const width = preferredToolsMegaMenuWidth(vw);
      expect(width).toBeLessThanOrEqual(vw - TOOLS_MEGA_MENU.gutterPx * 2);
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

  it("shifts right instead of clipping when the trigger is too far left", () => {
    const vw = 1024;
    const trigger = leftishToolsTrigger();
    const box = place(vw, trigger, 40 * 16);
    expect(box.left).toBe(TOOLS_MEGA_MENU.gutterPx);
    expect(box.left + box.width).toBeLessThanOrEqual(
      vw - TOOLS_MEGA_MENU.gutterPx,
    );
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
      700 - TOOLS_MEGA_MENU.gutterPx,
    );
    expect(box.maxHeight).toBeLessThanOrEqual(700 * TOOLS_MEGA_MENU.maxHeightVh);
  });
});

describe("Tools mega-menu source stays clamped", () => {
  it("does not hard-set a 90vw/40rem/52rem panel width", () => {
    const source = readFileSync(
      join(srcRoot, "components/layout/nav/MenuContents.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/w-\[min\(90vw/);
    expect(source).not.toMatch(/xl:w-\[min\(90vw/);
    expect(source).toContain("TOOLS_MEGA_MENU_GRID_CLASS");
  });

  it("wires the header Tools flyout through viewport clamp", () => {
    const source = readFileSync(
      join(srcRoot, "components/layout/Header.tsx"),
      "utf8",
    );
    expect(source).toMatch(/preferredPanelWidth=\{preferredToolsMegaMenuWidth\}/);
  });

  it("uses 2 columns until 2xl (not xl:grid-cols-4)", () => {
    const tokens = TOOLS_MEGA_MENU_GRID_CLASS.split(/\s+/);
    expect(tokens).toContain("grid-cols-2");
    expect(tokens).toContain("2xl:grid-cols-4");
    expect(tokens).not.toContain("xl:grid-cols-4");
  });
});
