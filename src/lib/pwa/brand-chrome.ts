import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { buildPwaIconSvg } from "@/lib/brand/unionops-mark-svg";
import { buildWebManifest } from "@/lib/pwa/manifest";
import { ICON_192_PATH, ICON_512_PATH } from "@/lib/seo/site";

/** Cookie so server `/manifest.webmanifest` can mirror Brand Kit theme_color. */
export const PWA_THEME_COOKIE = "uo_pwa_theme";

const BRAND_HEX = /^#[0-9A-Fa-f]{6}$/;

export function normalizePwaThemeColor(
  value: unknown,
  fallback: string = BRAND_COLORS.primary,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!BRAND_HEX.test(trimmed)) return fallback;
  return trimmed.toUpperCase();
}

export function parsePwaThemeCookie(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName !== PWA_THEME_COOKIE) continue;
    const raw = decodeURIComponent(rest.join("=").trim());
    if (!BRAND_HEX.test(raw)) return null;
    return raw.toUpperCase();
  }
  return null;
}

export function pwaThemeCookieValue(primaryColor: string): string {
  const color = normalizePwaThemeColor(primaryColor);
  return `${PWA_THEME_COOKIE}=${encodeURIComponent(color)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/** Upsert `<meta name="theme-color">` for tab / installed window chrome. */
export function setThemeColorMeta(
  primaryColor: string,
  doc: Document = document,
): void {
  const color = normalizePwaThemeColor(primaryColor);
  let meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement("meta");
    meta.setAttribute("name", "theme-color");
    doc.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function setPwaThemeCookie(
  primaryColor: string,
  doc: Document = document,
): void {
  doc.cookie = pwaThemeCookieValue(primaryColor);
}

type ObjectUrlStore = {
  manifestUrl: string | null;
  icon192Url: string | null;
  icon512Url: string | null;
  icon32Url: string | null;
  faviconUrl: string | null;
};

const objectUrls: ObjectUrlStore = {
  manifestUrl: null,
  icon192Url: null,
  icon512Url: null,
  icon32Url: null,
  faviconUrl: null,
};

/** Ignore stale async results when Brand Kit colours change quickly. */
let syncGeneration = 0;

function revoke(url: string | null): void {
  if (url) URL.revokeObjectURL(url);
}

async function svgToPngObjectUrl(svg: string, size: number): Promise<string> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to decode brand icon SVG"));
      img.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.drawImage(img, 0, 0, size, size);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG encode failed"))),
        "image/png",
      );
    });
    return URL.createObjectURL(pngBlob);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function ensureLink(
  rel: string,
  attrs: Record<string, string>,
  doc: Document,
): HTMLLinkElement {
  let link = doc.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = doc.createElement("link");
    link.rel = rel;
    doc.head.appendChild(link);
  }
  for (const [key, value] of Object.entries(attrs)) {
    link.setAttribute(key, value);
  }
  return link;
}

/**
 * Browsers keep the first matching `rel=icon` / shortcut icon and cache hard.
 * Next metadata also injects SVG + PNG + ICO, so mutating one href leaves the
 * tab on `/favicon.ico`. Strip competitors and insert a fresh link so the
 * branded blob wins.
 */
export function replaceDocumentFavicons(
  icons: Array<{ href: string; type?: string; sizes?: string }>,
  doc: Document = document,
): void {
  doc
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    .forEach((el) => el.remove());

  for (const icon of icons) {
    const link = doc.createElement("link");
    link.rel = "icon";
    if (icon.type) link.setAttribute("type", icon.type);
    if (icon.sizes) link.setAttribute("sizes", icon.sizes);
    // Assign href last so the browser treats this as a new icon fetch.
    link.href = icon.href;
    doc.head.appendChild(link);
  }
}

function replaceAppleTouchIcon(
  href: string,
  doc: Document,
): void {
  doc.querySelectorAll('link[rel="apple-touch-icon"]').forEach((el) => el.remove());
  const link = doc.createElement("link");
  link.rel = "apple-touch-icon";
  link.setAttribute("sizes", "180x180");
  link.setAttribute("type", "image/png");
  link.href = href;
  doc.head.appendChild(link);
}

function setSafariMaskIconColor(primaryColor: string, doc: Document): void {
  const color = normalizePwaThemeColor(primaryColor);
  const mask = doc.querySelector('link[rel="mask-icon"]') as HTMLLinkElement | null;
  if (mask) mask.setAttribute("color", color);
}

/**
 * Build a Brand Kit–colored install manifest (icons still host paths until
 * client blob URLs are attached).
 */
export function buildBrandKitManifest(options: {
  primaryColor: string;
  officerHubPublic?: boolean;
  icon192?: string;
  icon512?: string;
}): MetadataRoute.Manifest {
  return buildWebManifest({
    officerHubPublic: options.officerHubPublic ?? isOfficerHubPublic(),
    themeColor: normalizePwaThemeColor(options.primaryColor),
    icon192: options.icon192 ?? ICON_192_PATH,
    icon512: options.icon512 ?? ICON_512_PATH,
  });
}

/**
 * Apply Brand Kit primary to PWA chrome: theme-color meta, theme cookie,
 * generated 32/192/512 icons, tab favicon (replacing static icon links), and
 * a blob `link[rel=manifest]` for Install.
 *
 * Brand bytes stay on-device (blob URLs + cookie hex only). Host static icons
 * remain the crawler/fallback defaults until the client sync runs.
 */
export async function syncPwaBrandChrome(options: {
  primaryColor: string;
  officerHubPublic?: boolean;
  doc?: Document;
}): Promise<"synced" | "skipped"> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "skipped";
  }
  const doc = options.doc ?? document;
  const primary = normalizePwaThemeColor(options.primaryColor);

  setThemeColorMeta(primary, doc);
  setPwaThemeCookie(primary, doc);

  const svg = buildPwaIconSvg({ primary });
  // Generation token: rapid Brand Kit colour changes can overlap; only the
  // latest sync may mutate head / revoke prior blob URLs.
  const generation = ++syncGeneration;
  const [icon32Url, icon192Url, icon512Url] = await Promise.all([
    svgToPngObjectUrl(svg, 32),
    svgToPngObjectUrl(svg, 192),
    svgToPngObjectUrl(svg, 512),
  ]);

  if (generation !== syncGeneration) {
    revoke(icon32Url);
    revoke(icon192Url);
    revoke(icon512Url);
    return "skipped";
  }

  const faviconSvg = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const faviconUrl = URL.createObjectURL(faviconSvg);

  const manifest = buildBrandKitManifest({
    primaryColor: primary,
    officerHubPublic: options.officerHubPublic,
    icon192: icon192Url,
    icon512: icon512Url,
  });
  const manifestBlob = new Blob([JSON.stringify(manifest)], {
    type: "application/manifest+json",
  });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  revoke(objectUrls.manifestUrl);
  revoke(objectUrls.icon192Url);
  revoke(objectUrls.icon512Url);
  revoke(objectUrls.faviconUrl);
  revoke(objectUrls.icon32Url);
  objectUrls.manifestUrl = manifestUrl;
  objectUrls.icon192Url = icon192Url;
  objectUrls.icon512Url = icon512Url;
  objectUrls.faviconUrl = faviconUrl;
  objectUrls.icon32Url = icon32Url;

  ensureLink("manifest", { href: manifestUrl }, doc);
  // SVG + 32 PNG: Chrome often prefers a sized PNG; SVG covers modern tabs.
  replaceDocumentFavicons(
    [
      { href: faviconUrl, type: "image/svg+xml", sizes: "any" },
      { href: icon32Url, type: "image/png", sizes: "32x32" },
    ],
    doc,
  );
  replaceAppleTouchIcon(icon192Url, doc);
  setSafariMaskIconColor(primary, doc);

  return "synced";
}
