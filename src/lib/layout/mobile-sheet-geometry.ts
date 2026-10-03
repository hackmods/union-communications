/** Side-rail sheet (Hub/Portal/public) starts at this CSS px width. */
export const MOBILE_SHEET_SIDE_PANEL_MIN_PX = 480;

type LayoutWindow = {
  innerWidth: number;
  visualViewport: { width: number } | null;
  document: { documentElement: { clientWidth: number } };
};

/**
 * Smallest live layout width. Pixel 5 + `isMobile` can make `matchMedia(480px)`
 * true while Playwright still reports a 320px viewport; never use that MQ to
 * decide whether to pin the phone sheet.
 */
export function readLayoutViewportWidth(win: LayoutWindow): number {
  const visual = win.visualViewport?.width ?? win.innerWidth;
  return Math.round(
    Math.min(win.innerWidth, win.document.documentElement.clientWidth, visual),
  );
}

export function isMobileSheetSidePanel(layoutWidth: number): boolean {
  return layoutWidth >= MOBILE_SHEET_SIDE_PANEL_MIN_PX;
}

/**
 * Pin a full-bleed phone sheet to the live layout viewport.
 *
 * Tailwind `min-w-0` / `max-w-full` is not enough on CI: Linux Chromium +
 * Accessibility 1.5× text lets flex min-content grow the dialog past 320px.
 * Inline `!important` sizes win over that intrinsic minimum. Above 480px the
 * CSS side rail takes over.
 */
export function clampMobileSheetToViewport(
  panel: HTMLElement,
  layoutWidth: number,
  sidePanel: boolean,
): void {
  panel.style.setProperty("box-sizing", "border-box", "important");
  panel.style.setProperty("min-width", "0px", "important");
  panel.style.setProperty("overflow-x", "hidden", "important");
  if (sidePanel) {
    panel.style.removeProperty("left");
    panel.style.removeProperty("right");
    panel.style.removeProperty("width");
    panel.style.removeProperty("max-width");
    return;
  }
  const width = `${Math.max(0, layoutWidth)}px`;
  panel.style.setProperty("left", "0px", "important");
  panel.style.setProperty("right", "auto", "important");
  panel.style.setProperty("width", width, "important");
  panel.style.setProperty("max-width", width, "important");
}
