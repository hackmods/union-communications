export interface Local {
  id: string;
  localNumber: string;
  subText: string;
  divisionId?: string;
}

export interface Division {
  id: string;
  name: string;
  code: string;
}

export interface Officer {
  id: string;
  name: string;
  role: string;
  localId: string;
}

/** Freeform social / promo / resource link on Brand Kit */
export interface LocalLink {
  id: string;
  label: string;
  url: string;
}

export interface BrandKit {
  version: "1.1";
  local: Local;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  useOfficialLogo: boolean;
  /** Which bundled official logo to use when useOfficialLogo is true */
  officialLogoVariant?: "lockup" | "mark" | "slitBlue" | "slitWhite";
  customLogoDataUrl?: string;
  /** Short monogram when no logo image is used (e.g. LU, 243) */
  logoText?: string;
  /** Active union preset id from Brand Kit (drives logo picker options) */
  unionPresetId?: string;
  divisionId?: string;
  /** Local website (optional) - used by QR cards, posters, website template */
  websiteUrl?: string;
  /** Facebook group or page (optional) */
  facebookUrl?: string;
  /** Additional social / promo / resource links */
  customLinks?: LocalLink[];
  updatedAt: string;
}
