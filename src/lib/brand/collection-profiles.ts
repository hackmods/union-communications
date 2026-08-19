import type { BrandKit, BrandKitPatch, BrandKitProfile } from "@/types/entities";
import {
  getUnionCollectionCatalog,
  isPresetWithCollectionCatalog,
  PROFILE_OTHER_ID,
  type UnionCollectionCatalog,
} from "@/lib/brand/collection-profile-catalog";
import { membershipUrlsForOpseuSector } from "@/lib/brand/membership-primary";
import {
  DEFAULT_OPSEU_SECTOR_ID,
  getOpseuSector,
  inferOpseuSectorId,
  isOpseuSectorId,
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_FT_LABEL,
  OPSEU_CAAT_SUPPORT_PT_ID,
  OPSEU_CAAT_SUPPORT_PT_LABEL,
} from "@/lib/brand/opseu-sector-catalog";

export {
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_FT_LABEL,
  OPSEU_CAAT_SUPPORT_PT_ID,
  OPSEU_CAAT_SUPPORT_PT_LABEL,
  DEFAULT_OPSEU_SECTOR_ID,
};

export const GENERIC_COLLECTION_PROFILE_ID = "profile-local";
export const GENERIC_COLLECTION_LABEL = "Local";

export function newBrandKitProfileId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function genericCollectionProfile(
  localNumber: string,
  subText: string,
): BrandKitProfile {
  return {
    id: GENERIC_COLLECTION_PROFILE_ID,
    label: GENERIC_COLLECTION_LABEL,
    localNumber,
    subText,
  };
}

/** @deprecated Use profiles from `getOpseuSector("caat-support")` */
export function opseuCaatSupportProfiles(
  localNumber: string,
): BrandKitProfile[] {
  return profilesFromOpseuSector(DEFAULT_OPSEU_SECTOR_ID, localNumber);
}

export function profilesFromCatalog(
  catalog: UnionCollectionCatalog,
  localNumber: string,
): BrandKitProfile[] {
  return catalog.profiles.map((template) => ({
    id: template.id,
    label: template.label,
    localNumber,
    subText: template.label,
    bargainingUnitCode: template.bargainingUnitCode,
  }));
}

export function profilesFromOpseuSector(
  sectorId: string | undefined,
  localNumber: string,
): BrandKitProfile[] {
  const sector = getOpseuSector(sectorId);
  return sector.profiles.map((template) => ({
    id: template.id,
    label: template.label,
    localNumber,
    subText: template.label,
    bargainingUnitCode: template.bargainingUnitCode,
  }));
}

export function collectionProfilesForOpseuSector(
  sectorId: string | undefined,
  localNumber: string,
): { profiles: BrandKitProfile[]; activeProfileId: string; opseuSectorId: string } {
  const sector = getOpseuSector(sectorId);
  return {
    profiles: profilesFromOpseuSector(sector.id, localNumber),
    activeProfileId: sector.defaultActiveId,
    opseuSectorId: sector.id,
  };
}

export function collectionPatchForOpseuSector(
  sectorId: string | undefined,
  localNumber: string,
  fallbackSubText: string,
): Pick<
  BrandKitPatch,
  "profiles" | "activeProfileId" | "local" | "opseuSectorId" | "membershipUrls"
> {
  const { profiles, activeProfileId, opseuSectorId } =
    collectionProfilesForOpseuSector(sectorId, localNumber);
  const active = profiles.find((profile) => profile.id === activeProfileId);
  return {
    profiles,
    activeProfileId,
    opseuSectorId,
    membershipUrls: membershipUrlsForOpseuSector(opseuSectorId, activeProfileId),
    local: {
      subText: active?.subText ?? fallbackSubText,
      bargainingUnitCode: active?.bargainingUnitCode,
    },
  };
}

export function collectionProfilesForPreset(
  presetId: string | undefined,
  localNumber: string,
  fallbackSubText: string,
  options?: { opseuSectorId?: string },
): {
  profiles: BrandKitProfile[];
  activeProfileId: string;
  opseuSectorId?: string;
} {
  if (presetId === "opseu") {
    return collectionProfilesForOpseuSector(
      options?.opseuSectorId ?? DEFAULT_OPSEU_SECTOR_ID,
      localNumber,
    );
  }

  const catalog = getUnionCollectionCatalog(presetId);
  if (catalog) {
    const profiles = profilesFromCatalog(catalog, localNumber);
    return { profiles, activeProfileId: catalog.defaultActiveId };
  }

  return {
    profiles: [genericCollectionProfile(localNumber, fallbackSubText)],
    activeProfileId: GENERIC_COLLECTION_PROFILE_ID,
  };
}

export function collectionPatchForPreset(
  presetId: string | undefined,
  localNumber: string,
  fallbackSubText: string,
  options?: { opseuSectorId?: string },
): Pick<
  BrandKitPatch,
  "profiles" | "activeProfileId" | "local" | "opseuSectorId" | "membershipUrls"
> {
  if (presetId === "opseu") {
    return collectionPatchForOpseuSector(
      options?.opseuSectorId ?? DEFAULT_OPSEU_SECTOR_ID,
      localNumber,
      fallbackSubText,
    );
  }

  const result = collectionProfilesForPreset(
    presetId,
    localNumber,
    fallbackSubText,
    options,
  );
  const active = result.profiles.find(
    (profile) => profile.id === result.activeProfileId,
  );
  return {
    profiles: result.profiles,
    activeProfileId: result.activeProfileId,
    ...(result.opseuSectorId ? { opseuSectorId: result.opseuSectorId } : {}),
    local: {
      subText: active?.subText ?? fallbackSubText,
      bargainingUnitCode: active?.bargainingUnitCode,
    },
  };
}

export function defaultProfilesForStoredKit(
  unionPresetId: string | undefined,
  localNumber: string,
  fallbackSubText: string,
  opseuSectorId?: string,
): BrandKitProfile[] {
  if (unionPresetId === "opseu") {
    return profilesFromOpseuSector(
      opseuSectorId ?? DEFAULT_OPSEU_SECTOR_ID,
      localNumber,
    );
  }
  const catalog = getUnionCollectionCatalog(unionPresetId);
  if (catalog) {
    return profilesFromCatalog(catalog, localNumber);
  }
  return [genericCollectionProfile(localNumber, fallbackSubText)];
}

export function resolveOpseuSectorId(
  unionPresetId: string | undefined,
  opseuSectorId: string | undefined,
  profiles: BrandKitProfile[] | undefined,
): string | undefined {
  if (unionPresetId !== "opseu") return undefined;
  if (isOpseuSectorId(opseuSectorId)) return opseuSectorId;
  return inferOpseuSectorId(profiles);
}

/** i18n key under `brandKit.profilePresetHint.*` */
export function collectionPresetHintKey(
  presetId: string | undefined,
  opseuSectorId?: string,
  profiles?: BrandKitProfile[],
): string | undefined {
  if (presetId === "opseu") {
    const sector =
      resolveOpseuSectorId("opseu", opseuSectorId, profiles) ??
      DEFAULT_OPSEU_SECTOR_ID;
    return `opseu-${sector}`;
  }
  if (isPresetWithCollectionCatalog(presetId)) return presetId;
  return undefined;
}

/** True when the preset ships a multi-row starter list (not just Local). */
export function hasStarterCollectionList(
  presetId: string | undefined,
): boolean {
  return presetId === "opseu" || isPresetWithCollectionCatalog(presetId);
}

export function reconcileActiveProfileId(
  profiles: BrandKitProfile[] | undefined,
  activeProfileId: string | undefined,
): string | undefined {
  if (!profiles?.length) return undefined;
  if (activeProfileId && profiles.some((profile) => profile.id === activeProfileId)) {
    return activeProfileId;
  }
  return profiles[0]?.id;
}

export function normalizeBrandKitProfiles(
  raw: unknown,
  fallback: BrandKitProfile[],
): BrandKitProfile[] {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    const out: BrandKitProfile[] = [];
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id =
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `profile-${i}`;
      const label =
        typeof row.label === "string" && row.label.trim()
          ? row.label.trim()
          : GENERIC_COLLECTION_LABEL;
      const localNumber =
        typeof row.localNumber === "string" ? row.localNumber : "";
      const subText = typeof row.subText === "string" ? row.subText : "";
      const code =
        typeof row.bargainingUnitCode === "string"
          ? row.bargainingUnitCode.trim()
          : "";
      out.push({
        id,
        label,
        localNumber,
        subText,
        bargainingUnitCode: code || undefined,
      });
    }
    return out.length > 0 ? out : fallback;
  }
  return fallback;
}

/** Keep saved profiles in sync when local identity fields change. */
export function syncBrandKitProfilesFromLocal(kit: BrandKit): BrandKit {
  const profiles = kit.profiles ?? [];
  if (profiles.length === 0) return kit;
  const activeId = kit.activeProfileId ?? profiles[0].id;
  return {
    ...kit,
    profiles: profiles.map((profile) => ({
      ...profile,
      localNumber: kit.local.localNumber,
      ...(profile.id === activeId
        ? {
            subText: kit.local.subText,
            bargainingUnitCode: kit.local.bargainingUnitCode,
          }
        : {}),
    })),
  };
}

/** @deprecated Use syncBrandKitProfilesFromLocal */
export function syncActiveBrandKitProfile(kit: BrandKit): BrandKit {
  return syncBrandKitProfilesFromLocal(kit);
}

export { isPresetWithCollectionCatalog, getUnionCollectionCatalog, PROFILE_OTHER_ID };

export function addBrandKitProfile(
  kit: BrandKit,
  label: string,
): BrandKit {
  const id = newBrandKitProfileId();
  const profile: BrandKitProfile = {
    id,
    label: label.trim() || GENERIC_COLLECTION_LABEL,
    localNumber: kit.local.localNumber,
    subText: kit.local.subText,
  };
  return {
    ...kit,
    profiles: [...(kit.profiles ?? []), profile],
    activeProfileId: id,
  };
}

export function removeBrandKitProfile(
  kit: BrandKit,
  profileId: string,
): BrandKit {
  const remaining = (kit.profiles ?? []).filter(
    (profile) => profile.id !== profileId,
  );
  if (remaining.length === 0) return kit;
  const nextId =
    kit.activeProfileId === profileId
      ? remaining[0].id
      : (kit.activeProfileId ?? remaining[0].id);
  const next = remaining.find((profile) => profile.id === nextId) ?? remaining[0];
  return {
    ...kit,
    profiles: remaining,
    activeProfileId: next.id,
    local: {
      ...kit.local,
      localNumber: next.localNumber,
      subText: next.subText,
      bargainingUnitCode: next.bargainingUnitCode,
    },
  };
}

export function renameBrandKitProfile(
  kit: BrandKit,
  profileId: string,
  label: string,
): BrandKit {
  const trimmed = label.trim();
  const activeId = kit.activeProfileId ?? kit.profiles?.[0]?.id;
  const isActive = profileId === activeId;
  return {
    ...kit,
    profiles: (kit.profiles ?? []).map((profile) =>
      profile.id === profileId
        ? {
            ...profile,
            label: trimmed,
            ...(isActive ? { subText: trimmed } : {}),
          }
        : profile,
    ),
    ...(isActive
      ? { local: { ...kit.local, subText: trimmed } }
      : {}),
  };
}
