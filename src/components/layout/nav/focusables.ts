export function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(nodes).filter((el) => !el.hasAttribute("disabled"));
}

export function getMenuItems(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ).filter((el) => !el.hasAttribute("disabled"));
}
