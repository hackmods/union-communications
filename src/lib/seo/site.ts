import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

export const SITE_URL = "https://unionops.org";

export const SITE_NAME = "UnionOps";

const hubPublic = isOfficerHubPublic();

export const SITE_TITLE = hubPublic
  ? "UnionOps | Free Tools & Officer Hub for Union Locals"
  : "UnionOps | Free Tools for Union Locals";

export const SITE_DESCRIPTION = hubPublic
  ? "Free tools for union stewards and officers. Comms stay on your device; host an Officer Hub and you control that instance."
  : "Free tools for union stewards and officers. Comms stay on your device — no ads, no subscriptions, no data harvesting.";

export const SITE_KEYWORDS = [
  "union grievance tracker",
  "union flyer maker",
  "steward tools",
  "local union website template",
] as const;

export const OG_IMAGE_PATH = "/opengraph-image";
export const TWITTER_IMAGE_PATH = "/twitter-image";
/** Static fallback for PWA / service worker (kept in sync with platform brand) */
export const OG_IMAGE_STATIC_PATH = "/og-image.png";

export const FAVICON_ICO_PATH = "/favicon.ico";
export const FAVICON_SVG_PATH = "/favicon.svg";
export const APPLE_TOUCH_ICON_PATH = "/apple-touch-icon.png";
export const ICON_192_PATH = "/icons/icon-192.png";
export const ICON_512_PATH = "/icons/icon-512.png";
export const SAFARI_PINNED_TAB_PATH = "/safari-pinned-tab.svg";
export const SAFARI_PINNED_TAB_COLOR = "#C2410C";

export const SHARE_BLURB = hubPublic
  ? "UnionOps is a free toolkit for union locals — stewarded by Ryan Morris. Flyer makers and steward tools on-device; host your own Officer Hub and you control that instance. No ads, no subscriptions, no data harvesting business. Solidarity."
  : "UnionOps is a free toolkit for union locals — stewarded by Ryan Morris. Flyer makers and steward tools stay on your device. No ads, no subscriptions, no data harvesting business. Solidarity.";

export type AppLocale = "en" | "fr";

export function absoluteUrl(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${normalized}`;
}

/** Locale-prefixed path with trailing slash (matches next.config trailingSlash). */
export function localePath(locale: string, path = "/"): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "").replace(/^\//, "");
  return clean ? `/${locale}/${clean}/` : `/${locale}/`;
}
