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

function singleIdentity(
  id: string,
  label: string,
  code: string,
): CollectionProfileTemplate[] {
  return withOther([{ id, label, bargainingUnitCode: code }]);
}

function identityPlusAdditional(
  primaryId: string,
  primaryLabel: string,
  primaryCode: string,
  additionalId: string,
  additionalLabel: string,
  additionalCode: string,
): CollectionProfileTemplate[] {
  return withOther([
    { id: primaryId, label: primaryLabel, bargainingUnitCode: primaryCode },
    {
      id: additionalId,
      label: additionalLabel,
      bargainingUnitCode: additionalCode,
    },
  ]);
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
    profiles: [
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
      { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
    ],
  },
  "caat-academic": {
    id: "caat-academic",
    label: "College Faculty (CAAT-A)",
    group: "education",
    referenceUrl: "https://opseu.org/sector/college-faculty",
    defaultActiveId: "profile-caat-a-ft",
    profiles: [
      {
        id: "profile-caat-a-ft",
        label: "College Faculty Full-time",
        bargainingUnitCode: "ft",
      },
      {
        id: "profile-caat-a-pt-sl",
        label: "Part-time sessional",
        bargainingUnitCode: "pt-sl",
      },
      { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
    ],
  },
  universities: {
    id: "universities",
    label: "Universities",
    group: "education",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-universities",
    profiles: singleIdentity(
      "profile-opseu-universities",
      "Universities",
      "university",
    ),
  },
  "boards-of-education": {
    id: "boards-of-education",
    label: "Boards of Education and Cultural Institutions",
    group: "education",
    referenceUrl: "https://opseu.org/sector/boards-of-education-and-cultural-institutions",
    defaultActiveId: "profile-opseu-education",
    profiles: singleIdentity(
      "profile-opseu-education",
      "Boards of Education",
      "education",
    ),
  },
  ops: {
    id: "ops",
    label: "Ontario Public Service",
    group: "public_service",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-ops",
    profiles: singleIdentity(
      "profile-opseu-ops",
      "Ontario Public Service",
      "ops",
    ),
  },
  corrections: {
    id: "corrections",
    label: "Corrections",
    group: "public_service",
    referenceUrl: "https://opseu.org/sector/corrections",
    defaultActiveId: "profile-opseu-corrections",
    profiles: singleIdentity(
      "profile-opseu-corrections",
      "Corrections",
      "corrections",
    ),
  },
  lcbo: {
    id: "lcbo",
    label: "Liquor Board Employees",
    group: "public_service",
    referenceUrl: "https://opseu.org/sector/liquor-board-employees",
    defaultActiveId: "profile-opseu-lcbo",
    profiles: singleIdentity(
      "profile-opseu-lcbo",
      "Liquor Board Employees",
      "lcbo",
    ),
  },
  municipalities: {
    id: "municipalities",
    label: "Municipalities",
    group: "public_service",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-municipal",
    profiles: identityPlusAdditional(
      "profile-opseu-municipal",
      "Municipalities",
      "municipal",
      "profile-opseu-municipal-add",
      "Additional workplace",
      "workplace-add",
    ),
  },
  mpac: {
    id: "mpac",
    label: "Municipal Property Assessment",
    group: "public_service",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-mpac",
    profiles: singleIdentity(
      "profile-opseu-mpac",
      "Municipal Property Assessment",
      "mpac",
    ),
  },
  "hospital-professionals": {
    id: "hospital-professionals",
    label: "Hospital Professionals",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/hospital-professionals",
    defaultActiveId: "profile-opseu-hpd",
    profiles: identityPlusAdditional(
      "profile-opseu-hpd",
      "Hospital Professionals",
      "hpd",
      "profile-opseu-hpd-bu-add",
      "Additional bargaining unit",
      "bu-add",
    ),
  },
  "hospital-support": {
    id: "hospital-support",
    label: "Hospital Support",
    group: "healthcare",
    referenceUrl: "https://opseu.org/sector/hospital-support",
    defaultActiveId: "profile-opseu-hs",
    profiles: identityPlusAdditional(
      "profile-opseu-hs",
      "Hospital Support",
      "hs",
      "profile-opseu-hs-bu-add",
      "Additional bargaining unit",
      "bu-add",
    ),
  },
  "long-term-care": {
    id: "long-term-care",
    label: "Long-Term Care",
    group: "healthcare",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-ltc",
    profiles: identityPlusAdditional(
      "profile-opseu-ltc",
      "Long-Term Care",
      "ltc",
      "profile-opseu-ltc-add",
      "Additional workplace",
      "workplace-add",
    ),
  },
  ambulance: {
    id: "ambulance",
    label: "Ambulance",
    group: "healthcare",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-ambulance",
    profiles: singleIdentity("profile-opseu-ambulance", "Ambulance", "ambulance"),
  },
  "mental-health": {
    id: "mental-health",
    label: "Mental Health",
    group: "healthcare",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-mental-health",
    profiles: singleIdentity(
      "profile-opseu-mental-health",
      "Mental Health",
      "mental-health",
    ),
  },
  "community-health": {
    id: "community-health",
    label: "Community Health Care Professionals",
    group: "healthcare",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-community-health",
    profiles: singleIdentity(
      "profile-opseu-community-health",
      "Community Health Care Professionals",
      "community-health",
    ),
  },
  "blood-services": {
    id: "blood-services",
    label: "Canadian Blood Services and Diagnostics",
    group: "healthcare",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-blood",
    profiles: singleIdentity(
      "profile-opseu-blood",
      "Canadian Blood Services and Diagnostics",
      "blood",
    ),
  },
  "community-agencies": {
    id: "community-agencies",
    label: "Community Agencies",
    group: "community",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-community-agencies",
    profiles: singleIdentity(
      "profile-opseu-community-agencies",
      "Community Agencies",
      "community",
    ),
  },
  "developmental-services": {
    id: "developmental-services",
    label: "Developmental Services",
    group: "community",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-dev-services",
    profiles: singleIdentity(
      "profile-opseu-dev-services",
      "Developmental Services",
      "dev-services",
    ),
  },
  "childrens-aid": {
    id: "childrens-aid",
    label: "Children's Aid Societies",
    group: "community",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-cas",
    profiles: singleIdentity(
      "profile-opseu-cas",
      "Children's Aid Societies",
      "cas",
    ),
  },
  "child-treatment": {
    id: "child-treatment",
    label: "Child Treatment Centres",
    group: "community",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-opseu-child-treatment",
    profiles: singleIdentity(
      "profile-opseu-child-treatment",
      "Child Treatment Centres",
      "child-treatment",
    ),
  },
  other: {
    id: "other",
    label: "Other OPSEU sector",
    group: "community",
    referenceUrl: "https://opseu.org",
    defaultActiveId: "profile-local",
    profiles: [{ id: "profile-local", label: "Local", bargainingUnitCode: "local" }],
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
