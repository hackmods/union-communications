export interface Local {
  id: string;
  localNumber: string;
  subText: string;
  divisionId?: string;
  /** Active collection code when set (ft / pt) */
  bargainingUnitCode?: string;
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

/** Who a membership application link is for (FT / PT / all) */
export type MembershipUrlAudience = "all" | "full_time" | "part_time";

/** Typed membership application / update URL on Brand Kit */
export interface MembershipUrl {
  id: string;
  label: string;
  url: string;
  audience: MembershipUrlAudience;
  /** Prefer this link when a tool asks for a single membership destination */
  primary?: boolean;
}

/** Saved local / collection identity for multi-profile Brand Kits */
export interface BrandKitProfile {
  id: string;
  label: string;
  localNumber: string;
  subText: string;
  bargainingUnitCode?: string;
}

export interface BrandKit {
  version: "1.1" | "2.0";
  /** Multi-union fields (Brand Kit v2) */
  unionId?: string;
  unionName?: string;
  divisionName?: string;
  local: Local;
  /** Optional profiles for FT/PT or multi-local communicators */
  profiles?: BrandKitProfile[];
  activeProfileId?: string;
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
  /** Membership application / update URLs (FT, PT, or shared) */
  membershipUrls?: MembershipUrl[];
  updatedAt: string;
}

/** Partial Brand Kit update — `local` is deep-partial (store merges onto current). */
export type BrandKitPatch = Omit<Partial<BrandKit>, "local" | "profiles"> & {
  local?: Partial<Local>;
  profiles?: BrandKitProfile[];
};
