import {
  defaultProfilesForStoredKit,
  normalizeBrandKitProfiles,
  reconcileActiveProfileId,
  resolveOpseuSectorId,
} from "@/lib/brand/collection-profiles";
import {
  normalizeCampaignPlate,
  normalizeIdentityPackId,
} from "@/lib/brand/identity-packs";
import { alignOpseuMembershipPrimary } from "@/lib/brand/membership-primary";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKitCanvas } from "@/lib/utils/canvas-tokens";
import type {
  BrandKit,
  LocalLink,
  MembershipUrl,
  MembershipUrlAudience,
} from "@/types/entities";

export interface SavedLink {
  id: string;
  label: string;
  url: string;
  kind: "website" | "facebook" | "custom" | "membership";
}

export interface MembershipDestination {
  id: string;
  label: string;
  url: string;
  audience: MembershipUrlAudience;
  primary?: boolean;
}

function trimUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t || undefined;
}

const BRAND_HEX = /^#[0-9A-Fa-f]{6}$/;

/** Keep a valid `#RRGGBB` colour; empty/invalid strings fall back to defaults. */
function asBrandHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return BRAND_HEX.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

function normalizeCustomLinks(raw: unknown): LocalLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = trimUrl(row.url);
      if (!url) return null;
      const label =
        typeof row.label === "string" && row.label.trim()
          ? row.label.trim()
          : "Link";
      const id =
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `link-${i}-${Date.now()}`;
      return { id, label, url } satisfies LocalLink;
    })
    .filter((x): x is LocalLink => x !== null);
}

const AUDIENCES: readonly MembershipUrlAudience[] = [
  "all",
  "full_time",
  "part_time",
];

function asAudience(value: unknown): MembershipUrlAudience {
  if (typeof value === "string" && AUDIENCES.includes(value as MembershipUrlAudience)) {
    return value as MembershipUrlAudience;
  }
  return "all";
}

function normalizeMembershipUrls(raw: unknown): MembershipUrl[] {
  if (!Array.isArray(raw)) return [];
  const out: MembershipUrl[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = trimUrl(row.url);
    if (!url) continue;
    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : "Membership application";
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : `membership-${i}-${Date.now()}`;
    out.push({
      id,
      label,
      url,
      audience: asAudience(row.audience),
      primary: row.primary === true ? true : undefined,
    });
  }
  return out;
}

/** Upgrade legacy kits to BrandKit 2.0 with multi-union + profile fields. */
export function normalizeBrandKit(raw: unknown): BrandKit {
  const base = { ...DEFAULT_BRAND_KIT, updatedAt: new Date().toISOString() };
  if (!raw || typeof raw !== "object") return base;

  const input = raw as Record<string, unknown>;
  const localIn =
    input.local && typeof input.local === "object"
      ? (input.local as Record<string, unknown>)
      : {};

  const unionPresetId =
    typeof input.unionPresetId === "string" && input.unionPresetId.trim()
      ? input.unionPresetId.trim()
      : undefined;

  const rawOpseuSectorId =
    typeof input.opseuSectorId === "string" && input.opseuSectorId.trim()
      ? input.opseuSectorId.trim()
      : undefined;

  const profileFallback = defaultProfilesForStoredKit(
    unionPresetId,
    typeof localIn.localNumber === "string"
      ? localIn.localNumber
      : base.local.localNumber,
    typeof localIn.subText === "string" ? localIn.subText : base.local.subText,
    rawOpseuSectorId,
  );

  const profiles =
    "profiles" in input
      ? normalizeBrandKitProfiles(input.profiles, profileFallback)
      : profileFallback;

  const opseuSectorId = resolveOpseuSectorId(
    unionPresetId,
    rawOpseuSectorId,
    profiles,
  );

  const activeProfileId = reconcileActiveProfileId(
    profiles,
    typeof input.activeProfileId === "string"
      ? input.activeProfileId
      : base.activeProfileId,
  );

  const activeProfile = profiles?.find((p) => p.id === activeProfileId);

  const local = {
    ...base.local,
    ...localIn,
    id:
      typeof localIn.id === "string" && localIn.id
        ? localIn.id
        : base.local.id,
    localNumber:
      typeof localIn.localNumber === "string"
        ? localIn.localNumber
        : (activeProfile?.localNumber ?? base.local.localNumber),
    subText:
      typeof localIn.subText === "string"
        ? localIn.subText
        : (activeProfile?.subText ?? base.local.subText),
    bargainingUnitCode: (() => {
      const raw =
        typeof localIn.bargainingUnitCode === "string"
          ? localIn.bargainingUnitCode.trim()
          : (activeProfile?.bargainingUnitCode ??
            base.local.bargainingUnitCode);
      return raw || undefined;
    })(),
  };

  const membershipUrls =
    input.membershipUrls !== undefined
      ? normalizeMembershipUrls(input.membershipUrls)
      : (base.membershipUrls ?? []);

  const useOfficialLogo =
    typeof input.useOfficialLogo === "boolean"
      ? input.useOfficialLogo
      : base.useOfficialLogo;

  // Official Look kits must not revive DEFAULT_BRAND_KIT's UnionOps mark after
  // JSON round-trips (undefined keys are dropped on save).
  let customLogoDataUrl: string | undefined;
  if ("customLogoDataUrl" in input) {
    customLogoDataUrl =
      typeof input.customLogoDataUrl === "string"
        ? input.customLogoDataUrl
        : undefined;
  } else if (useOfficialLogo) {
    customLogoDataUrl = undefined;
  } else if (typeof base.customLogoDataUrl === "string") {
    customLogoDataUrl = base.customLogoDataUrl;
  } else {
    customLogoDataUrl = undefined;
  }

  const identityPackId = normalizeIdentityPackId(
    input.identityPackId,
    unionPresetId,
  );

  return {
    ...base,
    ...input,
    version: "2.0",
    unionId:
      typeof input.unionId === "string" ? input.unionId : base.unionId,
    unionName:
      typeof input.unionName === "string" ? input.unionName : base.unionName,
    divisionName:
      typeof input.divisionName === "string"
        ? input.divisionName
        : base.divisionName,
    local,
    profiles,
    activeProfileId,
    primaryColor: asBrandHex(input.primaryColor, base.primaryColor),
    secondaryColor: asBrandHex(input.secondaryColor, base.secondaryColor),
    accentColor: asBrandHex(input.accentColor, base.accentColor),
    useOfficialLogo,
    customLogoDataUrl,
    unionPresetId,
    opseuSectorId,
    identityPackId,
    campaignPlate: normalizeCampaignPlate(input.campaignPlate, identityPackId),
    websiteUrl: trimUrl(input.websiteUrl),
    facebookUrl: trimUrl(input.facebookUrl),
    customLinks: normalizeCustomLinks(input.customLinks),
    membershipUrls,
    canvas: normalizeBrandKitCanvas(input.canvas),
    updatedAt:
      typeof input.updatedAt === "string"
        ? input.updatedAt
        : base.updatedAt,
  };
}

/** Apply a saved profile onto local identity fields. */
export function applyBrandKitProfile(
  kit: BrandKit,
  profileId: string,
): BrandKit {
  const profile = kit.profiles?.find((p) => p.id === profileId);
  if (!profile) return kit;
  return alignOpseuMembershipPrimary(
    normalizeBrandKit({
      ...kit,
      activeProfileId: profileId,
      local: {
        ...kit.local,
        localNumber: profile.localNumber,
        subText: profile.subText,
        bargainingUnitCode: profile.bargainingUnitCode,
      },
    }),
  );
}

/** Client-side: local website, else current origin (or empty on server). */
export function resolveLocalWebsiteUrl(
  kit: BrandKit,
  originFallback = "",
): string {
  return trimUrl(kit.websiteUrl) || originFallback;
}

/** Flatten website + facebook + custom into a picker list. */
export function listSavedLinks(
  kit: BrandKit,
  labels?: { website?: string; facebook?: string },
): SavedLink[] {
  const out: SavedLink[] = [];
  const website = trimUrl(kit.websiteUrl);
  if (website) {
    out.push({
      id: "website",
      label: labels?.website ?? "Website",
      url: website,
      kind: "website",
    });
  }
  const facebook = trimUrl(kit.facebookUrl);
  if (facebook) {
    out.push({
      id: "facebook",
      label: labels?.facebook ?? "Facebook",
      url: facebook,
      kind: "facebook",
    });
  }
  for (const link of kit.customLinks ?? []) {
    const url = trimUrl(link.url);
    if (!url) continue;
    out.push({
      id: link.id,
      label: link.label.trim() || "Link",
      url,
      kind: "custom",
    });
  }
  return out;
}

/** Membership application destinations from Brand Kit. */
export function listMembershipDestinations(
  kit: BrandKit,
): MembershipDestination[] {
  const out: MembershipDestination[] = [];
  for (const row of kit.membershipUrls ?? []) {
    const url = trimUrl(row.url);
    if (!url) continue;
    out.push({
      id: row.id,
      label: row.label.trim() || "Membership application",
      url,
      audience: row.audience,
      primary: row.primary,
    });
  }
  return out;
}

function resolveMembershipUrl(
  kit: BrandKit,
  audience?: MembershipUrlAudience,
): string | undefined {
  const rows = listMembershipDestinations(kit);
  if (rows.length === 0) return undefined;
  if (audience && audience !== "all") {
    const match = rows.find((r) => r.audience === audience);
    if (match) return match.url;
  }
  const primary = rows.find((r) => r.primary);
  return primary?.url ?? rows[0]?.url;
}

/** Resolve QR / poster destination for a named preset. */
export function resolvePresetDestination(
  presetId: string,
  kit: BrandKit,
  originFallback: string,
): string {
  const website = resolveLocalWebsiteUrl(kit, originFallback);
  const facebook = trimUrl(kit.facebookUrl);
  const softFallback = website || originFallback;

  switch (presetId) {
    case "getSupport":
      return softFallback;
    case "followUs":
      return facebook || softFallback;
    case "localWebsite":
      return softFallback;
    case "healthSafety":
      return softFallback;
    case "rightToRefuse": {
      const locale =
        typeof window !== "undefined"
          ? window.location.pathname.match(/^\/(en|fr)(?:\/|$)/)?.[1]
          : undefined;
      return `${originFallback}/${locale ?? "en"}/guide/right-to-refuse`;
    }
    case "joinUnion":
    case "membership-primary":
      return resolveMembershipUrl(kit) || softFallback;
    case "joinFullTime":
    case "membership-full-time":
      return resolveMembershipUrl(kit, "full_time") || softFallback;
    case "joinPartTime":
    case "membership-part-time":
      return resolveMembershipUrl(kit, "part_time") || softFallback;
    default:
      return softFallback;
  }
}

export function newLocalLinkId(): string {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMembershipUrlId(): string {
  return `membership-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
