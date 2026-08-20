/**
 * OPSEU/SEFPO sector starter lists — comms identities only, not Hub tenancy.
 * Labels follow official sector names from opseu.org and the OPSEU orientation booklet.
 * `referenceUrl` is for agent/docs context only — never written into Brand Kit.
 */

import {
  PROFILE_OTHER_ID,
  PROFILE_OTHER_LABEL,
  type CollectionProfileTemplate,
} from "@/lib/brand/collection-profile-catalog";

export const DEFAULT_OPSEU_SECTOR_ID = "caat-support";

export type OpseuSectorGroupId =
  | "education"
  | "public_service"
  | "healthcare"
  | "community";

export type OpseuSectorDefinition = {
  id: string;
  /** English stored label — UI uses i18n `brandKit.opseuSector.*` */
  label: string;
  group: OpseuSectorGroupId;
  referenceUrl: string;
  profiles: CollectionProfileTemplate[];
  defaultActiveId: string;
};

/** Stable CAAT Support profile ids (reference tenant compatibility). */
export const OPSEU_CAAT_SUPPORT_FT_ID = "profile-caat-s-ft";
export const OPSEU_CAAT_SUPPORT_PT_ID = "profile-caat-s-pt";
export const OPSEU_CAAT_SUPPORT_FT_LABEL = "College Support Full-time";
export const OPSEU_CAAT_SUPPORT_PT_LABEL = "College Support Part-time";

function withOther(
  profiles: CollectionProfileTemplate[],
): CollectionProfileTemplate[] {
  if (profiles.some((profile) => profile.id === PROFILE_OTHER_ID)) return profiles;
  return [
    ...profiles,
    { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
  ];
}

/**
 * Sourced sectors — see `.cursor/rules/brand-kit-collections.mdc`.
 * Orientation booklet sector list: OPSEU Owners' Manual (2020).
 */
export const OPSEU_SECTOR_CATALOG: Record<string, OpseuSectorDefinition> = {
  "caat-support": {
    id: "caat-support",
    label: "College Support (CAAT-S)",
    group: "education",
    referenceUrl: "https://opseu.org/sector/college-support-full-time",
    defaultActiveId: OPSEU_CAAT_SUPPORT_FT_ID,
    profiles: withOther([
      {
        id: OPSEU_CAAT_SUPPORT_FT_ID,
        label: OPSEU_CAAT_SUPPORT_FT_LABEL,
        bargainingUnitCode: "ft",
      },
      {
        id: OPSEU_CAAT_SUPPORT_PT_ID,
        label: OPSEU_CAAT_SUPPORT_PT_LABEL,
        bargainingUnitCode: "pt",
      },
    ]),
  },
  "caat-academic": {
    id: "caat-academic",
    label: "College Faculty (CAAT-A)",
    group: "education",
    referenceUrl: "https://opseu.org/sector/college-faculty",
    defaultActiveId: "profile-caat-a-ft",
    profiles: withOther([
      {
        id: "profile-caat-a-ft",
        label: "College Faculty Full-time",
        bargainingUnitCode: "ft",
      },
      {
        id: "profile-caat-a-pt-sl",
        label: "College Faculty Partial-load",
        bargainingUnitCode: "partial-load",
      },
    ]),
  },
  universities: {
    id: "universities",
    label: "Universities",
    group: "education",
    referenceUrl: "https://opseu.org/sector/universities",
    defaultActiveId: "profile-opseu-university-academic",
    profiles: withOther([
      {
        id: "profile-opseu-university-academic",
        label: "Academic support",
        bargainingUnitCode: "academic",
      },
      {
        id: "profile-opseu-university-campus",
        label: "Campus services",
        bargainingUnitCode: "campus",
      },
    ]),
  },
  "boards-of-education": {
    id: "boards-of-education",
    label: "Boards of Education and Cultural Institutions",
    group: "education",
    referenceUrl:
      "https://opseu.org/sector/boards-of-education-and-cultural-institutions",
    defaultActiveId: "profile-opseu-education",
    profiles: withOther([
      {
        id: "profile-opseu-education",
        label: "Boards of Education",
        bargainingUnitCode: "education",
      },
      {
        id: "profile-opseu-cultural",
        label: "Cultural institutions",
        bargainingUnitCode: "cultural",
      },
    ]),
  },
  ops: {
    id: "ops",
    label: "Ontario Public Service",
    group: "public_service",
    referenceUrl: "https://opseu.org/sector/ontario-public-service",
    defaultActiveId: "profile-opseu-ops-unified",
    profiles: withOther([
      {
        id: "profile-opseu-ops-unified",
        label: "OPS Unified",
        bargainingUnitCode: "unified",
      },
      {
        id: "profile-opseu-ops-crown",
        label: "Crown agency",
        bargainingUnitCode: "crown",
      },
    ]),
  },
  corrections: {
    id: "corrections",
    label: "Corrections",
    group: "public_service",
    referenceUrl: "https://opseu.org/sector/corrections",
    defaultActiveId: "profile-opseu-corrections-adult",
    profiles: withOther([
      {
        id: "profile-opseu-corrections-adult",
        label: "Adult corrections",
        bargainingUnitCode: "adult",
      },
      {
        id: "profile-opseu-corrections-youth",
        label: "Youth Justice",
        bargainingUnitCode: "youth",
      },
    ]),
  },
  lcbo: {
    id: "lcbo",
    label: "Liquor Board Employees",
    group: "public_service",
    referenceUrl: "https://opseu.org/sector/liquor-board-employees",
    defaultActiveId: "profile-opseu-lcbo-retail",
    profiles: withOther([
      {
        id: "profile-opseu-lcbo-retail",
        label: "Retail stores",
        bargainingUnitCode: "retail",
      },
      {
        id: "profile-opseu-lcbo-logistics",
        label: "Logistics / head office",
        bargainingUnitCode: "logistics",
      },
    ]),
  },
  municipalities: {
    id: "municipalities",
    label: "Municipalities",
    group: "public_service",
    referenceUrl: "https://opseu.org/sector/municipalities",
    defaultActiveId: "profile-opseu-municipal-inside",
    profiles: withOther([
      {
        id: "profile-opseu-municipal-inside",
        label: "Inside workers",
        bargainingUnitCode: "inside",
      },
      {
        id: "profile-opseu-municipal-outside",
        label: "Outside workers",
        bargainingUnitCode: "outside",
      },
    ]),
  },
  mpac: {
    id: "mpac",
    label: "Municipal Property Assessment",
    group: "public_service",
    referenceUrl: "https://opseu.org/sector/municipal-property-assessment",
    defaultActiveId: "profile-opseu-mpac-field",
    profiles: withOther([
      {
        id: "profile-opseu-mpac-field",
        label: "Field assessment",
        bargainingUnitCode: "field",
      },
      {
        id: "profile-opseu-mpac-office",
        label: "Head office",
        bargainingUnitCode: "office",
      },
    ]),
  },
  "hospital-professionals": {
    id: "hospital-professionals",
    label: "Hospital Professionals",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/hospital-professionals",
    defaultActiveId: "profile-opseu-hpd-central",
    profiles: withOther([
      {
        id: "profile-opseu-hpd-central",
        label: "Hospital Professionals (central)",
        bargainingUnitCode: "hpd",
      },
      {
        id: "profile-opseu-hpd-local",
        label: "Hospital local unit",
        bargainingUnitCode: "hpd-local",
      },
    ]),
  },
  "hospital-support": {
    id: "hospital-support",
    label: "Hospital Support",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/hospital-support",
    defaultActiveId: "profile-opseu-hs-service",
    profiles: withOther([
      {
        id: "profile-opseu-hs-service",
        label: "Hospital service",
        bargainingUnitCode: "service",
      },
      {
        id: "profile-opseu-hs-clerical",
        label: "Hospital clerical",
        bargainingUnitCode: "clerical",
      },
    ]),
  },
  "long-term-care": {
    id: "long-term-care",
    label: "Long-Term Care",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/long-term-care",
    defaultActiveId: "profile-opseu-ltc-care",
    profiles: withOther([
      {
        id: "profile-opseu-ltc-care",
        label: "Nursing / personal care",
        bargainingUnitCode: "care",
      },
      {
        id: "profile-opseu-ltc-support",
        label: "Support services",
        bargainingUnitCode: "support",
      },
    ]),
  },
  ambulance: {
    id: "ambulance",
    label: "Ambulance",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/ambulance",
    defaultActiveId: "profile-opseu-paramedic",
    profiles: withOther([
      {
        id: "profile-opseu-paramedic",
        label: "Paramedics",
        bargainingUnitCode: "paramedic",
      },
      {
        id: "profile-opseu-ambulance-comms",
        label: "Emergency communication",
        bargainingUnitCode: "comms",
      },
    ]),
  },
  "mental-health": {
    id: "mental-health",
    label: "Mental Health",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/mental-health",
    defaultActiveId: "profile-opseu-mental-health",
    profiles: withOther([
      {
        id: "profile-opseu-mental-health",
        label: "Mental health",
        bargainingUnitCode: "mental-health",
      },
      {
        id: "profile-opseu-addictions",
        label: "Addictions",
        bargainingUnitCode: "addictions",
      },
    ]),
  },
  "community-health": {
    id: "community-health",
    label: "Community Health Care Professionals",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/community-health-care-professionals",
    defaultActiveId: "profile-opseu-community-health",
    profiles: withOther([
      {
        id: "profile-opseu-community-health",
        label: "Community health professionals",
        bargainingUnitCode: "community-health",
      },
      {
        id: "profile-opseu-community-clinic",
        label: "Clinic / site",
        bargainingUnitCode: "clinic",
      },
    ]),
  },
  "blood-services": {
    id: "blood-services",
    label: "Canadian Blood Services and Diagnostics",
    group: "healthcare",
    referenceUrl:
      "https://opseu.org/sector/canadian-blood-services-and-diagnostics",
    defaultActiveId: "profile-opseu-blood",
    profiles: withOther([
      {
        id: "profile-opseu-blood",
        label: "Canadian Blood Services",
        bargainingUnitCode: "blood",
      },
      {
        id: "profile-opseu-diagnostics",
        label: "Diagnostics / labs",
        bargainingUnitCode: "diagnostics",
      },
    ]),
  },
  "community-agencies": {
    id: "community-agencies",
    label: "Community Agencies",
    group: "community",
    referenceUrl: "https://opseu.org/sector/community-agencies",
    defaultActiveId: "profile-opseu-community-agency",
    profiles: withOther([
      {
        id: "profile-opseu-community-agency",
        label: "Community agency",
        bargainingUnitCode: "agency",
      },
      {
        id: "profile-opseu-community-housing",
        label: "Shelter / housing",
        bargainingUnitCode: "housing",
      },
    ]),
  },
  "developmental-services": {
    id: "developmental-services",
    label: "Developmental Services",
    group: "community",
    referenceUrl: "https://opseu.org/sector/developmental-services",
    defaultActiveId: "profile-opseu-dev-services",
    profiles: withOther([
      {
        id: "profile-opseu-dev-services",
        label: "Developmental services",
        bargainingUnitCode: "dev-services",
      },
      {
        id: "profile-opseu-community-living",
        label: "Community living",
        bargainingUnitCode: "community-living",
      },
    ]),
  },
  "childrens-aid": {
    id: "childrens-aid",
    label: "Children's Aid Societies",
    group: "community",
    referenceUrl: "https://opseu.org/sector/childrens-aid-societies",
    defaultActiveId: "profile-opseu-cas",
    profiles: withOther([
      {
        id: "profile-opseu-cas",
        label: "Children's Aid Society",
        bargainingUnitCode: "cas",
      },
      {
        id: "profile-opseu-cas-youth",
        label: "Youth services",
        bargainingUnitCode: "youth",
      },
    ]),
  },
  "child-treatment": {
    id: "child-treatment",
    label: "Child Treatment Centres",
    group: "community",
    referenceUrl: "https://opseu.org/sector/child-treatment-centres",
    defaultActiveId: "profile-opseu-child-treatment",
    profiles: withOther([
      {
        id: "profile-opseu-child-treatment",
        label: "Child treatment",
        bargainingUnitCode: "treatment",
      },
      {
        id: "profile-opseu-child-residential",
        label: "Residential",
        bargainingUnitCode: "residential",
      },
    ]),
  },
  other: {
    id: "other",
    label: "Other OPSEU / SEFPO sector",
    group: "community",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-local",
    profiles: [
      { id: "profile-local", label: "Local", bargainingUnitCode: "local" },
    ],
  },
};

export const OPSEU_SECTOR_IDS = Object.keys(OPSEU_SECTOR_CATALOG) as Array<
  keyof typeof OPSEU_SECTOR_CATALOG
>;

export const OPSEU_SECTOR_GROUP_ORDER: OpseuSectorGroupId[] = [
  "education",
  "public_service",
  "healthcare",
  "community",
];

export function getOpseuSector(
  sectorId: string | undefined,
): OpseuSectorDefinition {
  if (sectorId && OPSEU_SECTOR_CATALOG[sectorId]) {
    return OPSEU_SECTOR_CATALOG[sectorId];
  }
  return OPSEU_SECTOR_CATALOG[DEFAULT_OPSEU_SECTOR_ID];
}

export function isOpseuSectorId(value: string | undefined): value is string {
  return !!value && value in OPSEU_SECTOR_CATALOG;
}

/** Infer sector from saved profile ids when legacy kits omit `opseuSectorId`. */
const LEGACY_PROFILE_SECTOR: Record<string, string> = {
  "profile-opseu-universities": "universities",
  "profile-opseu-ops": "ops",
  "profile-opseu-corrections": "corrections",
  "profile-opseu-lcbo": "lcbo",
  "profile-opseu-municipal": "municipalities",
  "profile-opseu-mpac": "mpac",
  "profile-opseu-hpd": "hospital-professionals",
  "profile-opseu-hs": "hospital-support",
  "profile-opseu-ltc": "long-term-care",
  "profile-opseu-ambulance": "ambulance",
  "profile-opseu-community-agencies": "community-agencies",
};

export function inferOpseuSectorId(
  profiles: { id: string }[] | undefined,
): string {
  const ids = new Set((profiles ?? []).map((profile) => profile.id));
  if (ids.has(OPSEU_CAAT_SUPPORT_FT_ID) || ids.has(OPSEU_CAAT_SUPPORT_PT_ID)) {
    return "caat-support";
  }
  if (ids.has("profile-caat-a-ft") || ids.has("profile-caat-a-pt-sl")) {
    return "caat-academic";
  }
  for (const profileId of ids) {
    const legacy = LEGACY_PROFILE_SECTOR[profileId];
    if (legacy) return legacy;
  }
  for (const sectorId of OPSEU_SECTOR_IDS) {
    const sector = OPSEU_SECTOR_CATALOG[sectorId];
    if (sector.profiles.some((profile) => ids.has(profile.id))) {
      return sectorId;
    }
  }
  return DEFAULT_OPSEU_SECTOR_ID;
}

export function listOpseuSectorsByGroup(): Array<{
  group: OpseuSectorGroupId;
  sectors: OpseuSectorDefinition[];
}> {
  return OPSEU_SECTOR_GROUP_ORDER.map((group) => ({
    group,
    sectors: OPSEU_SECTOR_IDS.filter(
      (id) => OPSEU_SECTOR_CATALOG[id].group === group,
    ).map((id) => OPSEU_SECTOR_CATALOG[id]),
  }));
}
