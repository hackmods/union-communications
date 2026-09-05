import { BRAND_COLORS } from "@/lib/constants/brand";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

export const SITE_URL = "https://unionops.org";

export const SITE_NAME = "UnionOps";

const hubPublic = isOfficerHubPublic();

export const SITE_TITLE = hubPublic
  ? "UnionOps | Toolkit for locals and unions"
  : "UnionOps | Toolkit for union locals";

export const SITE_DESCRIPTION = hubPublic
  ? "Communications, steward training, and officer playbooks. Comms stay free on your device. Hosted Officer Hub has a hosting cost."
  : "Communications, steward training, and officer playbooks for union locals. They stay on your device: no ads, nobody harvesting your data.";

export const SITE_KEYWORDS = [
  "union grievance tracker",
  "union flyer maker",
  "steward tools",
  "local union website template",
] as const;

/**
 * Static share card. file extension bypasses i18n middleware and trailingSlash
 * redirects that break `/opengraph-image` for Twitter/Facebook crawlers.
 * Keep in sync with `src/lib/pwa/shell.ts` / `public/sw.js`.
 */
export const OG_IMAGE_PATH = "/og-image.png";
export const TWITTER_IMAGE_PATH = "/og-image.png";
/** @deprecated Prefer OG_IMAGE_PATH. same static asset. */
export const OG_IMAGE_STATIC_PATH = "/og-image.png";

export const FAVICON_ICO_PATH = "/favicon.ico";
export const FAVICON_SVG_PATH = "/favicon.svg";
export const APPLE_TOUCH_ICON_PATH = "/apple-touch-icon.png";
export const ICON_16_PATH = "/icons/icon-16.png";
export const ICON_32_PATH = "/icons/icon-32.png";
/** Google Search wants a square icon that is a multiple of 48px. */
export const ICON_48_PATH = "/icons/icon-48.png";
export const ICON_192_PATH = "/icons/icon-192.png";
export const ICON_512_PATH = "/icons/icon-512.png";
export const SAFARI_PINNED_TAB_PATH = "/safari-pinned-tab.svg";
/** Mask colour for Safari pinned tab. host brand primary. */
export const SAFARI_PINNED_TAB_COLOR = BRAND_COLORS.primary;

export const SHARE_BLURB = hubPublic
  ? "UnionOps is a toolkit for a local or a union. Comms stay free on your device, stewarded by Ryan Morris. If we host Officer Hub or Local Portal, hosting has a cost, and you control who sees that data. No ads, nobody harvesting your data. Solidarity."
  : "UnionOps is a toolkit for a local or a union. Comms stay free on your device, stewarded by Ryan Morris. No ads, nobody harvesting your data. If we host Officer Hub or Local Portal, hosting has a cost. Self-host stays an option. Solidarity.";

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
