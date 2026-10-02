/**
 * Lock page scroll while a mobile sheet is open.
 * Prefer overflow:hidden on html/body over body position:fixed so sticky
 * chrome geometry (header / Hub bar) does not jump under rem text scale.
 */
export function lockBodyScroll(): () => void {
  const scrollY = window.scrollY;
  const html = document.documentElement;
  const body = document.body;
  const previous = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
  };
  const scrollbarGap = window.innerWidth - html.clientWidth;
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (scrollbarGap > 0) {
    body.style.paddingRight = `${scrollbarGap}px`;
  }

  return () => {
    html.style.overflow = previous.htmlOverflow;
    body.style.overflow = previous.bodyOverflow;
    body.style.paddingRight = previous.bodyPaddingRight;
    window.scrollTo(0, scrollY);
  };
}
