/**
 * Starter collection lists per union preset — comms identities only, not Hub tenancy.
 * Labels follow each union's common terminology; stewards rename/remove rows they do not use.
 * `referenceUrl` is the general homepage; `structureUrl` is the sourced structure page.
 * Neither is written into Brand Kit.
 */

export type CollectionProfileTemplate = {
  id: string;
  label: string;
  bargainingUnitCode: string;
};

export type UnionCollectionCatalog = {
  /** General union website for agent/docs context — not a Brand Kit field */
  referenceUrl: string;
  /** Sourced structure page (amalgamation, units, classification groups) */
  structureUrl: string;
  profiles: CollectionProfileTemplate[];
  defaultActiveId: string;
};

export const PROFILE_OTHER_ID = "profile-other";
export const PROFILE_OTHER_LABEL = "Other";

/** Preset ids with a shipped starter collection list (excludes opseu — sector catalog). */
export const PRESET_IDS_WITH_COLLECTION_CATALOG = [
  "cupe",
  "unifor",
  "usw",
  "ona",
  "psac",
] as const;

export type PresetIdWithCollectionCatalog =
  (typeof PRESET_IDS_WITH_COLLECTION_CATALOG)[number];

/**
 * Sourced starter lists — see `.cursor/rules/brand-kit-collections.mdc`.
 * CUPE: OLRB may certify FT, PT, casual, or all-employee units.
 * Unifor: amalgamated locals commonly split production / skilled trades / office.
 * USW: amalgamated locals use units (production, maintenance, office).
 * ONA: locals hold one or more employer units across hospital, LTC, and community.
 * PSAC: Treasury Board groups PA / TC / EB / SV / FB.
 */
export const UNION_COLLECTION_CATALOGS: Record<
  PresetIdWithCollectionCatalog,
  UnionCollectionCatalog
> = {
  cupe: {
    referenceUrl: "https://cupe.ca",
    structureUrl:
      "https://cupe.ca/counterpoint/three-locals-one-goal-how-coordination-transformed-their-bargaining-strategy",
    defaultActiveId: "profile-cupe-ft",
    profiles: [
      {
        id: "profile-cupe-ft",
        label: "Full-time unit",
        bargainingUnitCode: "ft",
      },
      {
        id: "profile-cupe-pt",
        label: "Part-time unit",
        bargainingUnitCode: "pt",
      },
      {
        id: "profile-cupe-casual",
        label: "Casual unit",
        bargainingUnitCode: "casual",
      },
      {
        id: "profile-cupe-all",
        label: "All-employee unit",
        bargainingUnitCode: "all",
      },
      {
        id: PROFILE_OTHER_ID,
        label: PROFILE_OTHER_LABEL,
        bargainingUnitCode: "other",
      },
    ],
  },
  unifor: {
    referenceUrl: "https://www.unifor.org",
    structureUrl:
      "https://www.unifor.org/sites/default/files/legacy/documents/document/unifor-amalgamatedlocals-en.pdf",
    defaultActiveId: "profile-unifor-production",
    profiles: [
      {
        id: "profile-unifor-production",
        label: "Production",
        bargainingUnitCode: "production",
      },
      {
        id: "profile-unifor-trades",
        label: "Skilled trades",
        bargainingUnitCode: "trades",
      },
      {
        id: "profile-unifor-office",
        label: "Office",
        bargainingUnitCode: "office",
      },
      {
        id: PROFILE_OTHER_ID,
        label: PROFILE_OTHER_LABEL,
        bargainingUnitCode: "other",
      },
    ],
  },
  usw: {
    referenceUrl: "https://usw.ca",
    structureUrl: "https://usw.org/usw-convention/resolution-no-17-amalgamation/",
    defaultActiveId: "profile-usw-production",
    profiles: [
      {
        id: "profile-usw-production",
        label: "Production",
        bargainingUnitCode: "production",
      },
      {
        id: "profile-usw-maintenance",
        label: "Maintenance",
        bargainingUnitCode: "maintenance",
      },
      {
        id: "profile-usw-office",
        label: "Office",
        bargainingUnitCode: "office",
      },
      {
        id: PROFILE_OTHER_ID,
        label: PROFILE_OTHER_LABEL,
        bargainingUnitCode: "other",
      },
    ],
  },
  ona: {
    referenceUrl: "https://ona.org",
    structureUrl: "https://ona.org/regions-locals-bargaining-units/",
    defaultActiveId: "profile-ona-hospital",
    profiles: [
      {
        id: "profile-ona-hospital",
        label: "Hospital",
        bargainingUnitCode: "hospital",
      },
      {
        id: "profile-ona-ltc",
        label: "Long-term care",
        bargainingUnitCode: "ltc",
      },
      {
        id: "profile-ona-community",
        label: "Public health / community",
        bargainingUnitCode: "community",
      },
      {
        id: PROFILE_OTHER_ID,
        label: PROFILE_OTHER_LABEL,
        bargainingUnitCode: "other",
      },
    ],
  },
  psac: {
    referenceUrl: "https://psacunion.ca",
    structureUrl: "https://psacunion.ca/which-bargaining-unit-am-i-in",
    defaultActiveId: "profile-psac-pa",
    profiles: [
      {
        id: "profile-psac-pa",
        label: "Program & Administration (PA)",
        bargainingUnitCode: "pa",
      },
      {
        id: "profile-psac-tc",
        label: "Technical (TC)",
        bargainingUnitCode: "tc",
      },
      {
        id: "profile-psac-eb",
        label: "Education & Library (EB)",
        bargainingUnitCode: "eb",
      },
      {
        id: "profile-psac-sv",
        label: "Operational Services (SV)",
        bargainingUnitCode: "sv",
      },
      {
        id: "profile-psac-fb",
        label: "Border Services (FB)",
        bargainingUnitCode: "fb",
      },
      {
        id: PROFILE_OTHER_ID,
        label: PROFILE_OTHER_LABEL,
        bargainingUnitCode: "other",
      },
    ],
  },
};

export function getUnionCollectionCatalog(
  presetId: string | undefined,
): UnionCollectionCatalog | undefined {
  if (!presetId) return undefined;
  return UNION_COLLECTION_CATALOGS[
    presetId as PresetIdWithCollectionCatalog
  ];
}

export function isPresetWithCollectionCatalog(
  presetId: string | undefined,
): presetId is PresetIdWithCollectionCatalog {
  return (
    !!presetId &&
    PRESET_IDS_WITH_COLLECTION_CATALOG.includes(
      presetId as PresetIdWithCollectionCatalog,
    )
  );
}
