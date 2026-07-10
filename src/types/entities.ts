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

export interface BrandKit {
  version: "1.0";
  local: Local;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  useOfficialLogo: boolean;
  /** Which bundled official logo to use when useOfficialLogo is true */
  officialLogoVariant?: "lockup" | "mark";
  customLogoDataUrl?: string;
  /** Short monogram when no logo image is used (e.g. LU, 243) */
  logoText?: string;
  divisionId?: string;
  updatedAt: string;
}
