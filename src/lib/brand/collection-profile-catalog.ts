/**
 * Starter collection lists per union preset — comms identities only, not Hub tenancy.
 * Labels follow each union's common terminology; stewards rename/remove rows they do not use.
 * `referenceUrl` is for agent/docs context only — never written into Brand Kit.
 */

export type CollectionProfileTemplate = {
  id: string;
  label: string;
  bargainingUnitCode?: string;
};

export type UnionCollectionCatalog = {
  /** General union website for structure research — not a Brand Kit field */
  referenceUrl: string;
  profiles: CollectionProfileTemplate[];
  defaultActiveId: string;
};

export const PROFILE_OTHER_ID = "profile-other";
export const PROFILE_OTHER_LABEL = "Other";

/** Preset ids with a shipped starter collection list (excludes opseu — separate CAAT Support path). */
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
 * CUPE: FT / PT / all-employee splits are common but not universal (OLRB-dependent).
 * Unifor/USW: amalgamated locals use multiple bargaining units / units.
 * ONA: locals comprise one or more employer bargaining units.
 * PSAC: Treasury Board groups PA / TC / EB / SV are the familiar classification split.
 */
export const UNION_COLLECTION_CATALOGS: Record<
  PresetIdWithCollectionCatalog,
  UnionCollectionCatalog
> = {
  cupe: {
    referenceUrl: "https://cupe.ca",
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
        id: "profile-cupe-all",
        label: "All-employee unit",
        bargainingUnitCode: "all",
      },
      { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
    ],
  },
  unifor: {
    referenceUrl: "https://www.unifor.org",
    defaultActiveId: "profile-unifor-bu",
    profiles: [
      {
        id: "profile-unifor-bu",
        label: "Bargaining unit",
        bargainingUnitCode: "bu",
      },
      {
        id: "profile-unifor-bu-add",
        label: "Additional bargaining unit",
        bargainingUnitCode: "bu-add",
      },
      { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
    ],
  },
  usw: {
    referenceUrl: "https://usw.ca",
    defaultActiveId: "profile-usw-unit",
    profiles: [
      { id: "profile-usw-unit", label: "Unit", bargainingUnitCode: "unit" },
      {
        id: "profile-usw-unit-add",
        label: "Additional unit",
        bargainingUnitCode: "unit-add",
      },
      { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
    ],
  },
  ona: {
    referenceUrl: "https://ona.org",
    defaultActiveId: "profile-ona-bu",
    profiles: [
      {
        id: "profile-ona-bu",
        label: "Bargaining unit",
        bargainingUnitCode: "bu",
      },
      {
        id: "profile-ona-bu-add",
        label: "Additional bargaining unit",
        bargainingUnitCode: "bu-add",
      },
      { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
    ],
  },
  psac: {
    referenceUrl: "https://psacunion.ca",
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
      { id: PROFILE_OTHER_ID, label: PROFILE_OTHER_LABEL, bargainingUnitCode: "other" },
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
