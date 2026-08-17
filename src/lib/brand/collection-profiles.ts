import type { BrandKit, BrandKitPatch, BrandKitProfile } from "@/types/entities";
import {
  getUnionCollectionCatalog,
  isPresetWithCollectionCatalog,
  type UnionCollectionCatalog,
} from "@/lib/brand/collection-profile-catalog";

export const GENERIC_COLLECTION_PROFILE_ID = "profile-local";
export const OPSEU_CAAT_SUPPORT_FT_ID = "profile-caat-s-ft";
export const OPSEU_CAAT_SUPPORT_PT_ID = "profile-caat-s-pt";

/** Official OPSEU/SEFPO CAAT Support sector names (not a platform-wide default). */
export const OPSEU_CAAT_SUPPORT_FT_LABEL = "College Support Full-time";
export const OPSEU_CAAT_SUPPORT_PT_LABEL = "College Support Part-time";

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

export function opseuCaatSupportProfiles(
  localNumber: string,
): BrandKitProfile[] {
  return [
    {
      id: OPSEU_CAAT_SUPPORT_FT_ID,
      label: OPSEU_CAAT_SUPPORT_FT_LABEL,
      localNumber,
      subText: OPSEU_CAAT_SUPPORT_FT_LABEL,
      bargainingUnitCode: "ft",
    },
    {
      id: OPSEU_CAAT_SUPPORT_PT_ID,
      label: OPSEU_CAAT_SUPPORT_PT_LABEL,
      localNumber,
      subText: OPSEU_CAAT_SUPPORT_PT_LABEL,
      bargainingUnitCode: "pt",
    },
  ];
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

export function collectionProfilesForPreset(
  presetId: string | undefined,
  localNumber: string,
  fallbackSubText: string,
): { profiles: BrandKitProfile[]; activeProfileId: string } {
  if (presetId === "opseu") {
    const profiles = opseuCaatSupportProfiles(localNumber);
    return { profiles, activeProfileId: OPSEU_CAAT_SUPPORT_FT_ID };
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
): Pick<BrandKitPatch, "profiles" | "activeProfileId" | "local"> {
  const { profiles, activeProfileId } = collectionProfilesForPreset(
    presetId,
    localNumber,
    fallbackSubText,
  );
  const active = profiles.find((profile) => profile.id === activeProfileId);
  return {
    profiles,
    activeProfileId,
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
): BrandKitProfile[] {
  if (unionPresetId === "opseu") {
    return opseuCaatSupportProfiles(localNumber);
  }
  const catalog = getUnionCollectionCatalog(unionPresetId);
  if (catalog) {
    return profilesFromCatalog(catalog, localNumber);
  }
  return [genericCollectionProfile(localNumber, fallbackSubText)];
}

export { isPresetWithCollectionCatalog, getUnionCollectionCatalog };

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

/** Keep the active saved profile in sync with Local number / sub-text / code. */
export function syncActiveBrandKitProfile(kit: BrandKit): BrandKit {
  const profiles = kit.profiles ?? [];
  if (profiles.length === 0) return kit;
  const activeId = kit.activeProfileId ?? profiles[0].id;
  return {
    ...kit,
    profiles: profiles.map((profile) =>
      profile.id === activeId
        ? {
            ...profile,
            localNumber: kit.local.localNumber,
            subText: kit.local.subText,
            bargainingUnitCode: kit.local.bargainingUnitCode,
          }
        : profile,
    ),
  };
}

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
  return {
    ...kit,
    profiles: (kit.profiles ?? []).map((profile) =>
      profile.id === profileId ? { ...profile, label: label.trim() } : profile,
    ),
  };
}
