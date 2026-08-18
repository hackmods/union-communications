/**
 * Viewport-safe placement for header flyouts (Tools mega-menu).
 *
 * The Tools panel is right-aligned to a mid-header trigger. A fixed 40/52rem
 * width overflows the left edge on lg/xl desktops (~1024–1440) and gets clipped
 * by `html { overflow-x: clip }`. Width + position must be clamped together.
 */

export type FlyoutAlign = "left" | "right";

export type FlyoutTriggerEdge = {
  left: number;
  right: number;
  bottom: number;
};

export type FlyoutBox = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export type ToolsMegaMenuWidthStep = {
  minViewport: number;
  widthPx: number;
  columns: 2 | 4;
};

/**
 * Preferred Tools mega-menu size by Tailwind breakpoint.
 * 4 visual columns only at 2xl — lg/xl stay 2-col so the panel fits laptops.
 */
export const TOOLS_MEGA_MENU = {
  gutterPx: 16,
  gapBelowTriggerPx: 4,
  maxHeightPx: 40 * 16,
  maxHeightVh: 0.8,
  widthSteps: [
    { minViewport: 1536, widthPx: 52 * 16, columns: 4 },
    { minViewport: 1280, widthPx: 36 * 16, columns: 2 },
    { minViewport: 1024, widthPx: 28 * 16, columns: 2 },
  ] as const satisfies readonly ToolsMegaMenuWidthStep[],
  fallbackWidthPx: 20 * 16,
  fallbackColumns: 2 as const,
} as const;

/** Inner mega-menu grid — keep in sync with `toolsMegaMenuColumnCount`. */
export const TOOLS_MEGA_MENU_GRID_CLASS =
  "grid grid-cols-2 gap-3 p-3 2xl:grid-cols-4";

/** Officer tools is a grouped list, not a 4-col mega-menu. */
export const HUB_TOOLS_MENU_WIDTH_PX = 18 * 16;

export function preferredHubToolsMenuWidth(): number {
  return HUB_TOOLS_MENU_WIDTH_PX;
}

export function preferredToolsMegaMenuWidth(viewportWidth: number): number {
  for (const step of TOOLS_MEGA_MENU.widthSteps) {
    if (viewportWidth >= step.minViewport) return step.widthPx;
  }
  return TOOLS_MEGA_MENU.fallbackWidthPx;
}

export function toolsMegaMenuColumnCount(viewportWidth: number): 2 | 4 {
  for (const step of TOOLS_MEGA_MENU.widthSteps) {
    if (viewportWidth >= step.minViewport) return step.columns;
  }
  return TOOLS_MEGA_MENU.fallbackColumns;
}

export function clampFlyoutToViewport(input: {
  viewportWidth: number;
  viewportHeight: number;
  trigger: FlyoutTriggerEdge;
  preferredWidth: number;
  align?: FlyoutAlign;
  gutter?: number;
  gapBelowTrigger?: number;
  maxHeightPx?: number;
  maxHeightVh?: number;
}): FlyoutBox {
  const gutter = input.gutter ?? TOOLS_MEGA_MENU.gutterPx;
  const gap = input.gapBelowTrigger ?? TOOLS_MEGA_MENU.gapBelowTriggerPx;
  const maxHeightPx = input.maxHeightPx ?? TOOLS_MEGA_MENU.maxHeightPx;
  const maxHeightVh = input.maxHeightVh ?? TOOLS_MEGA_MENU.maxHeightVh;
  const align = input.align ?? "right";

  const maxWidth = Math.max(0, input.viewportWidth - gutter * 2);
  const width = Math.min(Math.max(0, input.preferredWidth), maxWidth);

  const minLeft = gutter;
  const maxLeft = input.viewportWidth - gutter - width;
  const preferredLeft =
    align === "right" ? input.trigger.right - width : input.trigger.left;
  const left = Math.min(
    Math.max(preferredLeft, minLeft),
    Math.max(minLeft, maxLeft),
  );

  const top = input.trigger.bottom + gap;
  const fromViewport = input.viewportHeight - top - gutter;
  const fromVh = input.viewportHeight * maxHeightVh;
  const maxHeight = Math.max(0, Math.min(maxHeightPx, fromVh, fromViewport));

  return { left, top, width, maxHeight };
}

export function flyoutBoxFitsViewport(
  box: FlyoutBox,
  viewportWidth: number,
  viewportHeight: number,
  gutter: number = TOOLS_MEGA_MENU.gutterPx,
  epsilon: number = 0.5,
): boolean {
  return (
    box.left >= gutter - epsilon &&
    box.top >= 0 - epsilon &&
    box.left + box.width <= viewportWidth - gutter + epsilon &&
    box.top + box.maxHeight <= viewportHeight - gutter + epsilon
  );
}
