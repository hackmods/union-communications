function publishCssPx(
  cssVariable: `--${string}`,
  px: number,
) {
  const value = `${px}px`;
  if (document.documentElement.style.getPropertyValue(cssVariable) !== value) {
    document.documentElement.style.setProperty(cssVariable, value);
  }
}

function observeLayoutSignals(
  update: () => void,
  elements: ReadonlyArray<Element>,
) {
  update();
  const resizeObserver =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
  for (const element of elements) {
    resizeObserver?.observe(element);
  }
  window.addEventListener("resize", update);
  window.addEventListener("scroll", update, true);
  const visualViewport = window.visualViewport;
  visualViewport?.addEventListener("resize", update);
  visualViewport?.addEventListener("scroll", update);

  const mutationObserver =
    typeof MutationObserver === "undefined" ? null : new MutationObserver(update);
  mutationObserver?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-font-size", "style", "class"],
  });

  return () => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    window.removeEventListener("resize", update);
    window.removeEventListener("scroll", update, true);
    visualViewport?.removeEventListener("resize", update);
    visualViewport?.removeEventListener("scroll", update);
  };
}

/** Publish an element's rendered block height for sticky offsets. */
export function observeStickyHeight(
  element: HTMLElement,
  cssVariable: `--${string}`,
  onMeasure?: (height: number) => void,
) {
  const update = () => {
    const height = Math.ceil(element.getBoundingClientRect().height);
    publishCssPx(cssVariable, height);
    onMeasure?.(height);
  };

  const stop = observeLayoutSignals(update, [element]);
  return () => {
    stop();
    document.documentElement.style.removeProperty(cssVariable);
  };
}

/**
 * Publish the live viewport bottom of sticky chrome so a sheet can pin under
 * the header / Hub bar after scroll, wrap, or Accessibility text scale.
 */
export function observeLiveChromeBottom(
  element: HTMLElement,
  cssVariable: `--${string}`,
  onMeasure?: (bottom: number) => void,
  alsoObserve: ReadonlyArray<Element> = [],
) {
  const update = () => {
    const bottom = Math.max(0, Math.ceil(element.getBoundingClientRect().bottom));
    publishCssPx(cssVariable, bottom);
    onMeasure?.(bottom);
  };

  const stop = observeLayoutSignals(update, [element, ...alsoObserve]);
  return () => {
    stop();
    document.documentElement.style.removeProperty(cssVariable);
  };
}
