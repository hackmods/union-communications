import { VIEWPORT_LAB_BLOCKED_PATH_PREFIXES } from "@/lib/security/framing-policy";

export type ViewportLabLocale = "en" | "fr";

export type ViewportLabQuery = {
  width: number;
  height: number;
  path: string;
  locale: ViewportLabLocale;
  compare?: boolean;
};

const DEFAULT_PATH = "/en/";
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 800;

function normalizePathname(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_PATH;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (typeof window !== "undefined" && url.origin !== window.location.origin) {
        return "";
      }
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch {
    return "";
  }
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return "";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function isBlockedViewportPath(pathname: string): boolean {
  const pathOnly = pathname.split(/[?#]/)[0] ?? pathname;
  const lower = pathOnly.toLowerCase();
  return VIEWPORT_LAB_BLOCKED_PATH_PREFIXES.some((prefix) => {
    if (lower === prefix || lower === `${prefix}/`) return true;
    const localeRe = new RegExp(`^/(en|fr)${prefix}(/|$)`, "i");
    if (localeRe.test(lower)) return true;
    return lower.startsWith(`${prefix}/`);
  });
}

export function sanitizeViewportFramePath(raw: string): string | null {
  const path = normalizePathname(raw);
  if (!path) return null;
  if (isBlockedViewportPath(path)) return null;
  return path;
}

export function ensureTrailingSlashPath(path: string): string {
  const [pathname, rest = ""] = path.split(/(?=[?#])/);
  if (!pathname || pathname.endsWith("/")) return path;
  if (/\.[a-z0-9]+$/i.test(pathname)) return path;
  return `${pathname}/${rest}`;
}

export function swapLocaleInPath(
  path: string,
  locale: ViewportLabLocale,
): string {
  const sanitized = sanitizeViewportFramePath(path) ?? DEFAULT_PATH;
  if (/^\/(en|fr)(\/|$)/i.test(sanitized)) {
    return sanitized.replace(/^\/(en|fr)/i, `/${locale}`);
  }
  return `/${locale}${sanitized.startsWith("/") ? sanitized : `/${sanitized}`}`;
}

export function parseViewportLabSearchParams(
  params: URLSearchParams,
): ViewportLabQuery {
  const w = Number.parseInt(params.get("w") ?? "", 10);
  const h = Number.parseInt(params.get("h") ?? "", 10);
  const localeRaw = params.get("locale");
  const locale: ViewportLabLocale =
    localeRaw === "fr" || localeRaw === "en" ? localeRaw : "en";
  const pathRaw = params.get("path") ?? `/${locale}/`;
  const path =
    sanitizeViewportFramePath(pathRaw) ??
    sanitizeViewportFramePath(`/${locale}/`) ??
    DEFAULT_PATH;
  return {
    width: Number.isFinite(w) && w >= 200 && w <= 4000 ? w : DEFAULT_WIDTH,
    height: Number.isFinite(h) && h >= 200 && h <= 4000 ? h : DEFAULT_HEIGHT,
    path: ensureTrailingSlashPath(path),
    locale,
    compare: params.get("compare") === "1" || params.get("compare") === "true",
  };
}

export function buildViewportLabSearchParams(query: ViewportLabQuery): string {
  const params = new URLSearchParams();
  params.set("w", String(Math.round(query.width)));
  params.set("h", String(Math.round(query.height)));
  params.set("path", query.path);
  params.set("locale", query.locale);
  if (query.compare) params.set("compare", "1");
  return params.toString();
}

export type OverflowResult =
  | { horizontalPx: number }
  | { error: string };

export function measureDocumentOverflow(doc: Document): OverflowResult {
  try {
    const root = doc.scrollingElement ?? doc.documentElement;
    const win = doc.defaultView;
    if (!win) return { error: "no_window" };
    const gutter = Math.max(0, win.innerWidth - root.clientWidth);
    const raw = root.scrollWidth - root.clientWidth;
    return { horizontalPx: Math.max(0, raw - gutter) };
  } catch {
    return { error: "cross_origin_or_unavailable" };
  }
}

export type AxeFinding = {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: number;
};

export type AxeRunResult =
  | { ok: true; violations: AxeFinding[] }
  | { ok: false; error: string };
