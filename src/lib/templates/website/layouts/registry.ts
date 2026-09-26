/**
 * Website Template layout ids — curated visual personalities over the same content.
 * See docs/audit/website-template-world-class-2026-09.md
 */

export const WEBSITE_LAYOUT_IDS = ["solidarity", "bulletin", "hall"] as const;

export type WebsiteLayoutId = (typeof WEBSITE_LAYOUT_IDS)[number];

export const DEFAULT_WEBSITE_LAYOUT_ID: WebsiteLayoutId = "solidarity";

export function isWebsiteLayoutId(value: unknown): value is WebsiteLayoutId {
  return (
    typeof value === "string" &&
    (WEBSITE_LAYOUT_IDS as readonly string[]).includes(value)
  );
}

export function coerceWebsiteLayoutId(value: unknown): WebsiteLayoutId {
  return isWebsiteLayoutId(value) ? value : DEFAULT_WEBSITE_LAYOUT_ID;
}

export type WebsiteSectionId =
  | "hero"
  | "about"
  | "leadership"
  | "stewards"
  | "committees"
  | "resources"
  | "events"
  | "contact";

export type WebsiteLayoutDefinition = {
  id: WebsiteLayoutId;
  /** CSS class on <body> / root wrapper */
  bodyClass: string;
  /** Homepage section order (omit empty optional sections at render time) */
  homeSections: readonly WebsiteSectionId[];
  /** Hero alignment / chrome recipe */
  heroStyle: "centered" | "editorial" | "split";
  /** Leadership presentation */
  leadershipStyle: "cards-band" | "editorial-list" | "split-bands";
  /** Nav treatment */
  navStyle: "classic" | "underline" | "quiet";
  /** Default density hint when Brand Kit density is unset */
  defaultDensity: "roomy" | "tight";
};

export const WEBSITE_LAYOUTS: Record<WebsiteLayoutId, WebsiteLayoutDefinition> =
  {
    solidarity: {
      id: "solidarity",
      bodyClass: "layout-solidarity",
      homeSections: [
        "hero",
        "about",
        "leadership",
        "stewards",
        "committees",
        "resources",
        "events",
        "contact",
      ],
      heroStyle: "centered",
      leadershipStyle: "cards-band",
      navStyle: "classic",
      defaultDensity: "roomy",
    },
    bulletin: {
      id: "bulletin",
      bodyClass: "layout-bulletin",
      homeSections: [
        "hero",
        "about",
        "resources",
        "leadership",
        "stewards",
        "committees",
        "events",
        "contact",
      ],
      heroStyle: "editorial",
      leadershipStyle: "editorial-list",
      navStyle: "underline",
      defaultDensity: "tight",
    },
    hall: {
      id: "hall",
      bodyClass: "layout-hall",
      homeSections: [
        "hero",
        "about",
        "leadership",
        "stewards",
        "committees",
        "events",
        "resources",
        "contact",
      ],
      heroStyle: "split",
      leadershipStyle: "split-bands",
      navStyle: "quiet",
      defaultDensity: "roomy",
    },
  };

export function getWebsiteLayout(
  layoutId: WebsiteLayoutId | undefined | null,
): WebsiteLayoutDefinition {
  return WEBSITE_LAYOUTS[coerceWebsiteLayoutId(layoutId)];
}
