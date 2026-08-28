export interface Local {
  id: string;
  localNumber: string;
  subText: string;
  divisionId?: string;
  /** Active collection code when set (e.g. ft / pt for OPSEU CAAT Support) */
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

/** Optional style packages that seed Brand Kit canvas chrome tokens */
export type CanvasStyleId = "solid" | "field" | "workshop";

export type CanvasAlignmentBias = "center" | "start" | "asymmetric";
export type CanvasDensity = "roomy" | "tight";
export type CanvasTypeScale = "compact" | "display" | "dense";
export type CanvasQrPlate = "white-card" | "inset" | "flush";
/**
 * Capture-safe surface treatments. `grain` uses a tiled PNG noise overlay.
 * `duotone` applies brand-coloured photo treatment (Graphic Maker spotlight etc.).
 */
export type CanvasSurface =
  | "flat"
  | "soft-gradient"
  | "accent-band"
  | "grain"
  | "duotone";

/** Shared canvas chrome preferences (hybrid: tools keep their own layout ids). */
export interface BrandKitCanvas {
  styleId?: CanvasStyleId;
  alignmentBias?: CanvasAlignmentBias;
  density?: CanvasDensity;
  typeScale?: CanvasTypeScale;
  qrPlate?: CanvasQrPlate;
  surface?: CanvasSurface;
  /** Catalog id from `@/lib/comms/canvas-fonts` (headline / display type). */
  headlineFontId?: string;
  /** Catalog id from `@/lib/comms/canvas-fonts` (body / supporting type). */
  bodyFontId?: string;
}

export interface BrandKit {
  version: "1.1" | "2.0";
  /** Multi-union fields (Brand Kit v2) */
  unionId?: string;
  unionName?: string;
  divisionName?: string;
  local: Local;
  /** Saved collection identities — one Local until a union preset loads starters */
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
  /** OPSEU/SEFPO sector when `unionPresetId` is `opseu` — drives starter collections */
  opseuSectorId?: string;
  /**
   * Collective Look pack (colours + official logos). Separate from collection
   * profiles. OPSEU defaults to national blue; College Support may pick CAAT-S.
   */
  identityPackId?: string;
  /**
   * Named campaign plate id for Looks that ship multiple field treatments
   * (e.g. CAAT-S `coral` / `gold`). Legacy kits may still store `primary` /
   * `accent` — hydrate coerces them onto named ids.
   */
  campaignPlate?: string;
  divisionId?: string;
  /** Local website (optional) - used by QR cards, posters, website template */
  websiteUrl?: string;
  /** Facebook group or page (optional) */
  facebookUrl?: string;
  /** Additional social / promo / resource links */
  customLinks?: LocalLink[];
  /** Membership application / update URLs (FT, PT, or shared) */
  membershipUrls?: MembershipUrl[];
  /** Shared canvas chrome tokens — omit for legacy export look */
  canvas?: BrandKitCanvas;
  updatedAt: string;
}

/** Partial Brand Kit update — `local` is deep-partial (store merges onto current). */
export type BrandKitPatch = Omit<
  Partial<BrandKit>,
  "local" | "profiles" | "canvas"
> & {
  local?: Partial<Local>;
  profiles?: BrandKitProfile[];
  /** Pass `null` or `undefined` with key present via store `"canvas" in partial` to clear */
  canvas?: BrandKitCanvas | null;
};
