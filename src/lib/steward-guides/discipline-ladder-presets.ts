/**
 * Progressive-discipline ladder presets for steward worksheets.
 * Preset ids and bargaining-unit code maps only — no union names in resolvers.
 */

import type { BrandKit, BrandKitProfile } from "@/types/entities";

export const DISCIPLINE_LADDER_PRESET_IDS = [
  "generic-progressive-4",
  "ol-verbal-4",
  "college-support-progressive",
  "college-academic-progressive",
] as const;

export type DisciplineLadderPresetId =
  (typeof DISCIPLINE_LADDER_PRESET_IDS)[number];

export type DisciplineLadderRungDef = {
  id: string;
  /** Key under preDisciplinaryLog.ladder.rungs.* */
  labelKey: string;
};

export type DisciplineLadderPreset = {
  id: DisciplineLadderPresetId;
  rungs: readonly DisciplineLadderRungDef[];
};

export type DisciplineLadderCustom = {
  sourcePresetId: string;
  rungs: { id: string; label: string }[];
};

export type ResolvedDisciplineLadder = {
  presetId: DisciplineLadderPresetId;
  /** True when steward custom rungs are active for the collection. */
  isCustom: boolean;
  rungs: { id: string; label: string }[];
};

const GENERIC_RUNGS: readonly DisciplineLadderRungDef[] = [
  { id: "coaching", labelKey: "coaching" },
  { id: "written", labelKey: "written" },
  { id: "suspension", labelKey: "suspension" },
  { id: "termination", labelKey: "termination" },
];

const OL_VERBAL_RUNGS: readonly DisciplineLadderRungDef[] = [
  { id: "verbal", labelKey: "verbal" },
  { id: "written", labelKey: "written" },
  { id: "suspension", labelKey: "suspension" },
  { id: "discharge", labelKey: "discharge" },
];

export const DISCIPLINE_LADDER_PRESETS: Record<
  DisciplineLadderPresetId,
  DisciplineLadderPreset
> = {
  "generic-progressive-4": {
    id: "generic-progressive-4",
    rungs: GENERIC_RUNGS,
  },
  "ol-verbal-4": {
    id: "ol-verbal-4",
    rungs: OL_VERBAL_RUNGS,
  },
  "college-support-progressive": {
    id: "college-support-progressive",
    rungs: GENERIC_RUNGS,
  },
  "college-academic-progressive": {
    id: "college-academic-progressive",
    rungs: GENERIC_RUNGS,
  },
};

export const DISCIPLINE_LADDER_RUNG_MIN = 3;
export const DISCIPLINE_LADDER_RUNG_MAX = 8;

export function isDisciplineLadderPresetId(
  value: unknown,
): value is DisciplineLadderPresetId {
  return (
    typeof value === "string" &&
    (DISCIPLINE_LADDER_PRESET_IDS as readonly string[]).includes(value)
  );
}

/** Map Brand Kit collection / bargaining-unit codes → default preset. */
export function defaultLadderPresetForBargainingUnitCode(
  code?: string | null,
): DisciplineLadderPresetId {
  const normalized = (code ?? "").trim().toLowerCase();
  if (
    normalized === "academic" ||
    normalized === "faculty" ||
    normalized === "caat-a" ||
    normalized === "pl" ||
    normalized === "partial-load"
  ) {
    return "college-academic-progressive";
  }
  if (
    normalized === "pt" ||
    normalized === "ptss" ||
    normalized === "caat-s-pt" ||
    normalized === "part-time" ||
    normalized === "support" ||
    normalized === "ft" ||
    normalized === "ftss" ||
    normalized === "caat-s-ft" ||
    normalized === "full-time"
  ) {
    return "college-support-progressive";
  }
  return "generic-progressive-4";
}

export function activeBrandKitProfile(
  kit: Pick<BrandKit, "profiles" | "activeProfileId" | "local">,
): BrandKitProfile | undefined {
  const profiles = kit.profiles ?? [];
  if (profiles.length === 0) return undefined;
  const activeId = kit.activeProfileId ?? profiles[0]?.id;
  return profiles.find((p) => p.id === activeId) ?? profiles[0];
}

export function resolveLadderPresetId(
  kit: Pick<
    BrandKit,
    "profiles" | "activeProfileId" | "local" | "opseuSectorId"
  >,
): DisciplineLadderPresetId {
  const profile = activeBrandKitProfile(kit);
  if (isDisciplineLadderPresetId(profile?.ladderPresetId)) {
    return profile.ladderPresetId;
  }
  const code =
    profile?.bargainingUnitCode ?? kit.local?.bargainingUnitCode ?? null;
  return defaultLadderPresetForBargainingUnitCode(code);
}

export function normalizeDisciplineLadderCustom(
  raw: unknown,
): DisciplineLadderCustom | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const sourcePresetId =
    typeof row.sourcePresetId === "string" ? row.sourcePresetId.trim() : "";
  if (!isDisciplineLadderPresetId(sourcePresetId)) return undefined;
  if (!Array.isArray(row.rungs)) return undefined;
  const rungs: { id: string; label: string }[] = [];
  for (const item of row.rungs.slice(0, DISCIPLINE_LADDER_RUNG_MAX)) {
    if (!item || typeof item !== "object") continue;
    const rung = item as Record<string, unknown>;
    const id =
      typeof rung.id === "string" && rung.id.trim()
        ? rung.id.trim().slice(0, 40)
        : `rung-${rungs.length + 1}`;
    const label =
      typeof rung.label === "string" ? rung.label.trim().slice(0, 80) : "";
    if (!label) continue;
    rungs.push({ id, label });
  }
  if (
    rungs.length < DISCIPLINE_LADDER_RUNG_MIN ||
    rungs.length > DISCIPLINE_LADDER_RUNG_MAX
  ) {
    return undefined;
  }
  return { sourcePresetId, rungs };
}

/** Resolve display rungs; `labelForKey` maps preset labelKey → localized string. */
export function resolveDisciplineLadder(
  kit: Pick<
    BrandKit,
    "profiles" | "activeProfileId" | "local" | "opseuSectorId"
  >,
  labelForKey: (labelKey: string) => string,
): ResolvedDisciplineLadder {
  const profile = activeBrandKitProfile(kit);
  const custom = normalizeDisciplineLadderCustom(profile?.disciplineLadderCustom);
  if (custom) {
    return {
      presetId: isDisciplineLadderPresetId(custom.sourcePresetId)
        ? custom.sourcePresetId
        : resolveLadderPresetId(kit),
      isCustom: true,
      rungs: custom.rungs.map((r) => ({ ...r })),
    };
  }
  const presetId = resolveLadderPresetId(kit);
  const preset = DISCIPLINE_LADDER_PRESETS[presetId];
  return {
    presetId,
    isCustom: false,
    rungs: preset.rungs.map((rung) => ({
      id: rung.id,
      label: labelForKey(rung.labelKey),
    })),
  };
}

export function presetRungsAsCustom(
  presetId: DisciplineLadderPresetId,
  labelForKey: (labelKey: string) => string,
): DisciplineLadderCustom {
  const preset = DISCIPLINE_LADDER_PRESETS[presetId];
  return {
    sourcePresetId: presetId,
    rungs: preset.rungs.map((rung) => ({
      id: rung.id,
      label: labelForKey(rung.labelKey),
    })),
  };
}

export function patchActiveProfileLadder(
  kit: BrandKit,
  patch: {
    ladderPresetId?: DisciplineLadderPresetId | string;
    disciplineLadderCustom?: DisciplineLadderCustom | null;
  },
): BrandKit {
  const profiles = [...(kit.profiles ?? [])];
  if (profiles.length === 0) {
    const id = "default";
    const profile: BrandKitProfile = {
      id,
      label: kit.local.subText || "Collection",
      localNumber: kit.local.localNumber,
      subText: kit.local.subText,
      bargainingUnitCode: kit.local.bargainingUnitCode,
      ladderPresetId: isDisciplineLadderPresetId(patch.ladderPresetId)
        ? patch.ladderPresetId
        : undefined,
      disciplineLadderCustom:
        patch.disciplineLadderCustom === null
          ? undefined
          : (patch.disciplineLadderCustom ?? undefined),
    };
    return {
      ...kit,
      profiles: [profile],
      activeProfileId: id,
    };
  }
  const activeId = kit.activeProfileId ?? profiles[0].id;
  return {
    ...kit,
    profiles: profiles.map((profile) => {
      if (profile.id !== activeId) return profile;
      const next: BrandKitProfile = { ...profile };
      if (patch.ladderPresetId !== undefined) {
        next.ladderPresetId = isDisciplineLadderPresetId(patch.ladderPresetId)
          ? patch.ladderPresetId
          : undefined;
      }
      if ("disciplineLadderCustom" in patch) {
        if (patch.disciplineLadderCustom == null) {
          delete next.disciplineLadderCustom;
        } else {
          next.disciplineLadderCustom = patch.disciplineLadderCustom;
        }
      }
      return next;
    }),
  };
}
