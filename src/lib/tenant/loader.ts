import referenceTenant from "../../../seed/reference-tenant-opseu-caat.json";
import type { TenantSeed, TenantContext } from "@/types/tenant";

const SEEDS: TenantSeed[] = [referenceTenant as TenantSeed];

export function getAllTenantSeeds(): TenantSeed[] {
  return SEEDS;
}

export function getTenantByUnionSlug(slug: string): TenantSeed | undefined {
  return SEEDS.find((s) => s.union.slug === slug);
}

export function getTenantByUnionId(unionId: string): TenantSeed | undefined {
  return SEEDS.find((s) => s.union.id === unionId);
}

export function getTenantContext(unionId: string): TenantContext | null {
  const seed = getTenantByUnionId(unionId);
  if (!seed) return null;
  return {
    union: seed.union,
    division: seed.division,
    local: seed.local,
    brandDefaults: seed.brandDefaults,
    grievanceConfig: seed.grievanceConfig,
  };
}

export function getDefaultBrandDefaults() {
  const seed = SEEDS[0];
  return seed?.brandDefaults ?? {
    primaryColor: "#003DA5",
    secondaryColor: "#FFFFFF",
    accentColor: "#002868",
    useOfficialLogo: true,
    assetPackPath: "/assets/caat-opseu/",
  };
}
