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
  customLogoDataUrl?: string;
  divisionId?: string;
  updatedAt: string;
}
