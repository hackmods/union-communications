export type HubModule = "comms" | "grievance" | "bumping" | "time";

export type UserRole =
  | "platform_admin"
  | "union_admin"
  | "division_admin"
  | "local_president"
  | "local_steward"
  | "local_exec"
  | "stability_member"
  | "solo_account";

export interface Union {
  id: string;
  name: string;
  slug: string;
  defaultLocale: "en" | "fr";
  enabledModules: HubModule[];
}

export interface Division {
  id: string;
  unionId: string;
  name: string;
  code: string;
  enabledModules: HubModule[];
}

export interface TenantLocal {
  id: string;
  unionId: string;
  divisionId?: string;
  localNumber: string;
  subText: string;
}

/** CA group under a local (e.g. FT / PT Support Staff). UI label: Collection. */
export interface BargainingUnit {
  id: string;
  unionId: string;
  localId: string;
  code: string;
  name: string;
  grievanceConfig?: GrievanceConfig;
}

export interface BrandDefaults {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  useOfficialLogo: boolean;
  assetPackPath: string;
}

export interface GrievanceStep {
  number: number;
  name: string;
  responseDays: number | null;
}

export interface GrievanceConfig {
  steps: GrievanceStep[];
}

export interface TenantSeed {
  version: string;
  description?: string;
  union: Union;
  division?: Division;
  /** @deprecated Prefer `locals` — kept for older single-local seeds */
  local?: TenantLocal;
  locals?: TenantLocal[];
  bargainingUnits?: BargainingUnit[];
  brandDefaults: BrandDefaults;
  /** Union-level fallback CA steps when no collection/local config applies */
  grievanceConfig?: GrievanceConfig;
  moduleConfig?: Record<
    string,
    { enabled: boolean; label: string; gpsPolicy?: string }
  >;
}

export interface TenantContext {
  union: Union;
  division?: Division;
  /** Primary / default local (first in seed or legacy `local`) */
  local?: TenantLocal;
  locals: TenantLocal[];
  bargainingUnits: BargainingUnit[];
  brandDefaults: BrandDefaults;
  grievanceConfig?: GrievanceConfig;
}

/** Active Hub scope for elevated switchers */
export interface HubActiveContext {
  localId?: string;
  bargainingUnitId?: string;
}
