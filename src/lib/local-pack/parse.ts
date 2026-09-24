import { normalizeBrandKit } from "@/lib/utils/local-links";
import { parsePublicRosterJson } from "@/lib/org-chart/schema";
import { userPreferencesSchema } from "@/lib/validation/hub-settings";
import { parseWebsiteDraft } from "./website-draft";
import {
  LOCAL_PACK_KIND,
  LOCAL_PACK_VERSION,
  type LocalPack,
  type LocalPackParseResult,
  type LocalPackV1,
} from "./types";

function looksLikeBrandKit(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  if (!rec.local || typeof rec.local !== "object") return false;
  const version = rec.version;
  return (
    version === "1.0" ||
    version === "1.1" ||
    version === "2.0" ||
    typeof version === "string"
  );
}

function parseBrandKitSection(raw: unknown): LocalPack["brandKit"] | "invalid" {
  if (raw === undefined) return undefined;
  if (!looksLikeBrandKit(raw)) return "invalid";
  try {
    return normalizeBrandKit(raw);
  } catch {
    return "invalid";
  }
}

function parseRosterSection(
  raw: unknown,
): LocalPack["publicRoster"] | "invalid" {
  if (raw === undefined) return undefined;
  const parsed = parsePublicRosterJson(raw);
  if (!parsed.ok) return "invalid";
  return parsed.roster;
}

function parsePreferencesSection(
  raw: unknown,
): LocalPack["preferences"] | "invalid" {
  if (raw === undefined) return undefined;
  const parsed = userPreferencesSchema.safeParse(raw);
  if (!parsed.success) return "invalid";
  return parsed.data;
}

function parseOnboardingSection(
  raw: unknown,
): boolean | undefined | "invalid" {
  if (raw === undefined) return undefined;
  if (typeof raw !== "boolean") return "invalid";
  return raw;
}

function parseDraftSection(
  raw: unknown,
): LocalPack["websiteDraft"] | "invalid" {
  if (raw === undefined) return undefined;
  const parsed = parseWebsiteDraft(raw);
  if (!parsed.ok) return "invalid";
  return parsed.draft;
}

/**
 * Identity migrator for v1. Future versions add `migrateLocalPackVn` and chain
 * here so old downloads keep loading.
 */
export function migrateLocalPackV1(raw: Record<string, unknown>): LocalPackV1 {
  return {
    kind: LOCAL_PACK_KIND,
    version: LOCAL_PACK_VERSION,
    exportedAt:
      typeof raw.exportedAt === "string" && raw.exportedAt
        ? raw.exportedAt
        : new Date().toISOString(),
    brandKit: undefined,
    publicRoster: undefined,
    preferences: undefined,
    onboardingComplete: undefined,
    websiteDraft: undefined,
  };
}

export function parseLocalPack(raw: unknown): LocalPackParseResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "invalidJson" };
  }
  const rec = raw as Record<string, unknown>;
  if (rec.kind !== LOCAL_PACK_KIND) {
    return { ok: false, code: "wrongKind" };
  }
  if (rec.version !== LOCAL_PACK_VERSION && rec.version !== 1) {
    return { ok: false, code: "unsupportedVersion" };
  }

  const base = migrateLocalPackV1(rec);

  const brandKit = parseBrandKitSection(rec.brandKit);
  if (brandKit === "invalid") {
    return { ok: false, code: "invalidSection", detail: "brandKit" };
  }
  const publicRoster = parseRosterSection(rec.publicRoster);
  if (publicRoster === "invalid") {
    return { ok: false, code: "invalidSection", detail: "publicRoster" };
  }
  const preferences = parsePreferencesSection(rec.preferences);
  if (preferences === "invalid") {
    return { ok: false, code: "invalidSection", detail: "preferences" };
  }
  const onboardingComplete = parseOnboardingSection(rec.onboardingComplete);
  if (onboardingComplete === "invalid") {
    return { ok: false, code: "invalidSection", detail: "onboardingComplete" };
  }
  const websiteDraft = parseDraftSection(rec.websiteDraft);
  if (websiteDraft === "invalid") {
    return { ok: false, code: "invalidSection", detail: "websiteDraft" };
  }

  const pack: LocalPack = {
    ...base,
    brandKit,
    publicRoster,
    preferences,
    onboardingComplete,
    websiteDraft,
  };

  const hasSection =
    pack.brandKit !== undefined ||
    pack.publicRoster !== undefined ||
    pack.preferences !== undefined ||
    pack.onboardingComplete !== undefined ||
    pack.websiteDraft !== undefined;

  if (!hasSection) {
    return { ok: false, code: "empty" };
  }

  return { ok: true, pack };
}

export function parseLocalPackText(text: string): LocalPackParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, code: "invalidJson" };
  }
  return parseLocalPack(raw);
}
