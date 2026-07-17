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
  faviconUrl: string | null;
};

const objectUrls: ObjectUrlStore = {
  manifestUrl: null,
  icon192Url: null,
  icon512Url: null,
  faviconUrl: null,
};

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
 * generated 192/512 icons, and a blob `link[rel=manifest]` for Install.
 *
 * Brand bytes stay on-device (blob URLs + cookie hex only). Host static icons
 * remain the crawler/fallback defaults.
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
  const [icon192Url, icon512Url] = await Promise.all([
    svgToPngObjectUrl(svg, 192),
    svgToPngObjectUrl(svg, 512),
  ]);

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
  objectUrls.manifestUrl = manifestUrl;
  objectUrls.icon192Url = icon192Url;
  objectUrls.icon512Url = icon512Url;
  objectUrls.faviconUrl = faviconUrl;

  ensureLink("manifest", { href: manifestUrl }, doc);
  ensureLink(
    "icon",
    { href: faviconUrl, type: "image/svg+xml", sizes: "any" },
    doc,
  );
  ensureLink(
    "apple-touch-icon",
    { href: icon192Url, sizes: "180x180", type: "image/png" },
    doc,
  );

  return "synced";
}
