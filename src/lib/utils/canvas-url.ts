/**
 * Human-readable destination captions under QR plates.
 * Strips scheme / www so long links wrap and stay typeable when a scan fails.
 */
export function formatCanvasDisplayUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return trimmed;
    }
    const hostBase = u.hostname.replace(/^www\./i, "");
    const host = u.port ? `${hostBase}:${u.port}` : hostBase;
    const pathAndQuery = `${u.pathname}${u.search}${u.hash}`.replace(/\/$/, "");
    if (!pathAndQuery || pathAndQuery === "/") return host;
    return `${host}${pathAndQuery}`;
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "");
  }
}

/** URL caption size for multi-QR board cells (never below 9px). */
export function boardUrlFontSizePx(opts: {
  isTabloid: boolean;
  isDense: boolean;
  typeScale?: number;
}): number {
  const base = opts.isTabloid
    ? opts.isDense
      ? 11
      : 13
    : opts.isDense
      ? 9
      : 11;
  return Math.max(9, Math.round(base * (opts.typeScale ?? 1)));
}
