/** Publish an element's rendered block height for sticky offsets. */
export function observeStickyHeight(
  element: HTMLElement,
  cssVariable: `--${string}`,
  onMeasure?: (height: number) => void,
) {
  const update = () => {
    const height = Math.ceil(element.getBoundingClientRect().height);
    const value = `${height}px`;
    if (document.documentElement.style.getPropertyValue(cssVariable) !== value) {
      document.documentElement.style.setProperty(cssVariable, value);
    }
    onMeasure?.(height);
  };

  update();
  const resizeObserver =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
  resizeObserver?.observe(element);
  window.addEventListener("resize", update);

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
    document.documentElement.style.removeProperty(cssVariable);
  };
}
