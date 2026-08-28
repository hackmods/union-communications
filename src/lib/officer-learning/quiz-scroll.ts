/** Scroll the quiz section into view without jarring the reader. */
export function scrollQuizIntoView(element: HTMLElement | null): void {
  if (!element || typeof window === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({
    behavior: prefersReduced ? "instant" : "smooth",
    block: "start",
  });
}

/** Move keyboard focus to the first quiz option without scrolling again. */
export function focusQuizStart(container: HTMLElement | null): void {
  if (!container || typeof window === "undefined") return;
  requestAnimationFrame(() => {
    container.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({
      preventScroll: true,
    });
  });
}
