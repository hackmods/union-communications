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
  local?: TenantLocal;
  brandDefaults: BrandDefaults;
  grievanceConfig?: GrievanceConfig;
  moduleConfig?: Record<string, { enabled: boolean; label: string }>;
}

export interface TenantContext {
  union: Union;
  division?: Division;
  local?: TenantLocal;
  brandDefaults: BrandDefaults;
  grievanceConfig?: GrievanceConfig;
}
