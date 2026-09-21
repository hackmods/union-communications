/** Viewport-safe placement for compact authenticated-app flyouts. */
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

export const FLYOUT_DEFAULTS = {
  gutterPx: 16,
  gapBelowTriggerPx: 4,
  maxHeightPx: 40 * 16,
  maxHeightVh: 0.8,
} as const;

/** Officer tools are a compact authenticated-app list, not a public mega-menu. */
export const HUB_TOOLS_MENU_WIDTH_PX = 18 * 16;

export function preferredHubToolsMenuWidth(): number {
  return HUB_TOOLS_MENU_WIDTH_PX;
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
  const gutter = input.gutter ?? FLYOUT_DEFAULTS.gutterPx;
  const gap = input.gapBelowTrigger ?? FLYOUT_DEFAULTS.gapBelowTriggerPx;
  const maxHeightPx = input.maxHeightPx ?? FLYOUT_DEFAULTS.maxHeightPx;
  const maxHeightVh = input.maxHeightVh ?? FLYOUT_DEFAULTS.maxHeightVh;
  const align = input.align ?? "left";

  const maxWidth = Math.max(0, input.viewportWidth - gutter * 2);
  let width = Math.min(Math.max(0, input.preferredWidth), maxWidth);
  let left: number;

  if (align === "right") {
    const room = Math.max(0, input.trigger.right - gutter);
    if (width > room) width = room;
    left = input.trigger.right - width;
  } else {
    const room = Math.max(0, input.viewportWidth - gutter - input.trigger.left);
    if (width > room) width = room;
    left = input.trigger.left;
  }

  const minLeft = gutter;
  const maxLeft = input.viewportWidth - gutter - width;
  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));

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
  gutter: number = FLYOUT_DEFAULTS.gutterPx,
  epsilon: number = 0.5,
): boolean {
  return (
    box.left >= gutter - epsilon &&
    box.top >= 0 - epsilon &&
    box.left + box.width <= viewportWidth - gutter + epsilon &&
    box.top + box.maxHeight <= viewportHeight - gutter + epsilon
  );
}
