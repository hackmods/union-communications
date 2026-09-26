import type { CanvasFontId } from "@/lib/comms/canvas-fonts";
import type {
  PublicRosterGroup,
  PublicRosterUnit,
} from "@/types/public-roster";
import type { WebsiteLayoutId } from "@/lib/templates/website/layouts/registry";
import type { WebsiteSiteLocale } from "@/lib/templates/website/site-strings";

export type { WebsiteLayoutId } from "@/lib/templates/website/layouts/registry";
export {
  DEFAULT_WEBSITE_LAYOUT_ID,
  WEBSITE_LAYOUT_IDS,
  coerceWebsiteLayoutId,
  isWebsiteLayoutId,
} from "@/lib/templates/website/layouts/registry";

export interface WebsiteOfficer {
  name: string;
  role: string;
  location: string;
  /** From Public Roster when available — used to split leadership sections. */
  group?: PublicRosterGroup;
  committeeName?: string;
  unit?: PublicRosterUnit | null;
}

/** Steward-entered public event for the static site (not Hub sync). */
export interface WebsiteEvent {
  title: string;
  /** ISO date `YYYY-MM-DD` or datetime; displayed as entered when invalid. */
  when: string;
  location?: string;
  detail?: string;
}

/** Public http(s) link bundled from Brand Kit onto the exported site. */
export interface WebsiteNavLink {
  label: string;
  url: string;
}

export interface WebsiteTemplateData {
  localNumber: string;
  unionName: string;
  heroText: string;
  about1: string;
  about2: string;
  contactEmail: string;
  facebookUrl: string;
  /** Extra Brand Kit social / resource links (not Facebook, not the site URL). */
  customLinks?: WebsiteNavLink[];
  /** Brand Kit membership application / update URLs. */
  membershipLinks?: WebsiteNavLink[];
  officeAddress: string;
  primaryColor: string;
  secondaryColor: string;
  /** Brand Kit accent — used by bulletin/hall layouts and CTA accents. */
  accentColor?: string;
  /** Short identity line under the name (Brand Kit local.subText). */
  tagline?: string;
  /** Canonical public URL from Brand Kit when set. */
  websiteUrl?: string;
  contactPhone?: string;
  officeHours?: string;
  /** Hero CTA label; empty = localized default. */
  ctaLabel?: string;
  /** Curated visual personality. */
  layoutId?: WebsiteLayoutId;
  /** Chrome language for generated HTML (nav, section titles). */
  siteLocale?: WebsiteSiteLocale;
  /** Emit privacy.html + footer link (default true for new drafts). */
  includePrivacyPage?: boolean;
  /** Bundle assets/site-qr.png targeting websiteUrl when true. */
  includeSiteQr?: boolean;
  /** Optional static events (+ calendar.ics when non-empty). */
  events?: WebsiteEvent[];
  officers: WebsiteOfficer[];
  /** Relative asset filename for ZIP HTML (e.g. logo.png). Empty = text-only brand. */
  logoFileName: string;
  /** Preview iframe src (data URL or same-origin path). */
  logoPreviewSrc: string;
  logoAlt: string;
  /** OPSEU.org footer links — only when Brand Kit design theme is OPSEU. */
  includeOpseuResources: boolean;
  /**
   * Bundled hero pattern (`arc` / `mesh` / `bloom`) or `none`.
   * Omitted in tests = colour-only. A photo upload wins over the pattern.
   */
  heroArtId?: string;
  /** ZIP filename when the steward uploaded a photo (`hero.jpg`, …). */
  heroImageFileName?: string;
  /** Preview iframe src (data URL). Empty = use catalog pattern or none. */
  heroImagePreviewSrc?: string;
  /** Alt text for an uploaded photo. Patterns are decorative (empty alt). */
  heroImageAlt?: string;
  /** Optional Brand Kit canvas knobs mapped into exported CSS. */
  canvas?: {
    surface?: "flat" | "soft-gradient" | "accent-band" | "grain" | "duotone";
    typeScale?: "display" | "compact" | "dense";
    density?: "roomy" | "tight";
    /** Brand Kit catalog ids — embedded as `@font-face` in ZIP when non-system. */
    headlineFontId?: CanvasFontId;
    bodyFontId?: CanvasFontId;
  };
}

export const DEFAULT_WEBSITE_OFFICERS: WebsiteOfficer[] = [
  { name: "President Name", role: "President", location: "", group: "executive" },
  {
    name: "Vice President Name",
    role: "Vice President",
    location: "",
    group: "executive",
  },
  { name: "Secretary Name", role: "Secretary", location: "", group: "executive" },
  { name: "Treasurer Name", role: "Treasurer", location: "", group: "executive" },
];
