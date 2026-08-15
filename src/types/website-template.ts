import type { CanvasFontId } from "@/lib/comms/canvas-fonts";

export interface WebsiteOfficer {
  name: string;
  role: string;
  location: string;
}

export interface WebsiteTemplateData {
  localNumber: string;
  unionName: string;
  heroText: string;
  about1: string;
  about2: string;
  contactEmail: string;
  facebookUrl: string;
  officeAddress: string;
  primaryColor: string;
  secondaryColor: string;
  officers: WebsiteOfficer[];
  /** Relative asset filename for ZIP HTML (e.g. logo.png). Empty = text-only brand. */
  logoFileName: string;
  /** Preview iframe src (data URL or same-origin path). */
  logoPreviewSrc: string;
  logoAlt: string;
  /** OPSEU.org footer links — only when Brand Kit design theme is OPSEU. */
  includeOpseuResources: boolean;
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
  { name: "President Name", role: "President", location: "" },
  { name: "Vice President Name", role: "Vice President", location: "" },
  { name: "Secretary Name", role: "Secretary", location: "" },
  { name: "Treasurer Name", role: "Treasurer", location: "" },
];
