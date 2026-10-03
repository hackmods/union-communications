/**
 * Lock page scroll while a mobile sheet is open.
 *
 * Lock the documentElement scroller only. `overflow: hidden` on `body` makes
 * body a scroll container, which unsticks `position: sticky` chrome — the
 * header then jumps to its in-flow slot at the top of the document and the
 * menu paints over mid-page copy (Home “What stays free?”, large text, etc.).
 * Do not use `position: fixed` on body either: that offsets portaled sheets
 * and rem-scaled sticky bars.
 */
export function lockBodyScroll(): () => void {
  const scrollY = window.scrollY;
  const html = document.documentElement;
  const body = document.body;
  const previous = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyPaddingRight: body.style.paddingRight,
    hadSheetClass: html.classList.contains("nav-sheet-open"),
  };
  const scrollbarGap = window.innerWidth - html.clientWidth;
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overscrollBehavior = "none";
  html.classList.add("nav-sheet-open");
  if (scrollbarGap > 0) {
    body.style.paddingRight = `${scrollbarGap}px`;
  }

  return () => {
    html.style.overflow = previous.htmlOverflow;
    html.style.overscrollBehavior = previous.htmlOverscroll;
    body.style.overscrollBehavior = previous.bodyOverscroll;
    body.style.paddingRight = previous.bodyPaddingRight;
    if (!previous.hadSheetClass) {
      html.classList.remove("nav-sheet-open");
    }
    window.scrollTo(0, scrollY);
  };
}
