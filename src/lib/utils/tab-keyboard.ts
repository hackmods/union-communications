export type TabKeyEvent = Pick<KeyboardEvent, "key" | "preventDefault" | "currentTarget">;

/** Move focus and selection using the standard horizontal tablist keys. */
export function moveTabFocus<T extends string>(
  event: TabKeyEvent,
  current: T,
  tabs: readonly T[],
  select: (tab: T) => void,
  direction: "horizontal" | "vertical" = "horizontal",
) {
  if (tabs.length === 0 || !tabs.includes(current)) return;
  const tablist = event.currentTarget instanceof HTMLElement
    ? event.currentTarget.closest('[role="tablist"]')
    : null;
  const previous = direction === "horizontal" ? "ArrowLeft" : "ArrowUp";
  const next = direction === "horizontal" ? "ArrowRight" : "ArrowDown";
  let index = tabs.indexOf(current);
  if (event.key === previous) index = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === next) index = (index + 1) % tabs.length;
  else if (event.key === "Home") index = 0;
  else if (event.key === "End") index = tabs.length - 1;
  else return;

  event.preventDefault();
  select(tabs[index]);
  requestAnimationFrame(() => {
    if (!tablist?.isConnected) return;
    Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"][data-tab-key]'))
      .find((tab) => tab.dataset.tabKey === tabs[index])?.focus();
  });
}
