/** Side-rail sheet (Hub/Portal/public) starts at this CSS px width. */
export const MOBILE_SHEET_SIDE_PANEL_MQ = "(min-width: 480px)";

/**
 * Pin a full-bleed phone sheet to the live layout viewport.
 *
 * Tailwind `min-w-0` / `max-w-full` is not enough on CI: Linux Chromium +
 * Accessibility 1.5× text lets flex min-content (native `<select>`, module
 * labels) grow the dialog 4px past a 320px viewport. Inline sizes win over
 * that intrinsic minimum. Above 480px the CSS side rail takes over.
 */
export function clampMobileSheetToViewport(
  panel: HTMLElement,
  innerWidth: number,
  sidePanel: boolean,
): void {
  panel.style.boxSizing = "border-box";
  panel.style.minWidth = "0px";
  panel.style.overflowX = "hidden";
  if (sidePanel) {
    panel.style.removeProperty("left");
    panel.style.removeProperty("right");
    panel.style.removeProperty("width");
    panel.style.removeProperty("max-width");
    return;
  }
  const width = `${Math.max(0, innerWidth)}px`;
  panel.style.left = "0px";
  panel.style.right = "auto";
  panel.style.width = width;
  panel.style.maxWidth = width;
}
