/**
 * Normalize internal app paths for next.config `trailingSlash: true`.
 * Client-side App Router transitions can fail when query strings omit the slash
 * (`/tools/qr-card?preset=foo` vs `/tools/qr-card/?preset=foo`).
 */
export function withTrailingSlash(href: string): string {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("#") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return trimmed;
  }

  const hashIndex = trimmed.indexOf("#");
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : "";

  const queryIndex = withoutHash.indexOf("?");
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";

  if (path === "/" || path.endsWith("/")) {
    return `${path}${query}${hash}`;
  }

  return `${path}/${query}${hash}`;
}
