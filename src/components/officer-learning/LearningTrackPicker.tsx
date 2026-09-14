"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useOlTheme } from "./OlThemeProvider";

export type LearningTrackId = "all" | "steward" | "officer" | "mobilize";

/** Recommended module numbers for each track (1-based catalog numbers). */
export const LEARNING_TRACK_MODULES: Record<
  Exclude<LearningTrackId, "all">,
  readonly number[]
> = {
  steward: [1, 2, 3, 8, 9, 15, 16],
  officer: [4, 5, 11, 12, 13, 14],
  mobilize: [6, 7, 10, 14],
};

type Props = {
  active: LearningTrackId;
  onChange: (track: LearningTrackId) => void;
  className?: string;
};

const TRACKS: LearningTrackId[] = ["all", "steward", "officer", "mobilize"];

/**
 * Role-based path filters for the Officer Learning dashboard.
 * Filters the module card grid and highlights matching path steps.
 */
export function LearningTrackPicker({ active, onChange, className }: Props) {
  const t = useTranslations("officerLearning.tracks");
  const olTheme = useOlTheme();

  return (
    <div className={cn("mb-8", className)}>
      <p className={cn("mb-2", olTheme.sectionLabel)}>{t("label")}</p>
      <p className={cn("mb-4 max-w-prose text-sm leading-relaxed", olTheme.bodyMuted)}>
        {t("intro")}
      </p>
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        role="tablist"
        aria-label={t("label")}
      >
        {TRACKS.map((track) => {
          const selected = active === track;
          return (
            <button
              key={track}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(track)}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition",
                selected ? olTheme.chipPrimary : olTheme.chipSecondary,
              )}
            >
              <span className="block">{t(`${track}.title`)}</span>
              <span
                className={cn(
                  "mt-1 block text-xs font-normal leading-snug opacity-90",
                  olTheme.bodySmall,
                )}
              >
                {t(`${track}.blurb`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function moduleInTrack(
  moduleNumber: number,
  track: LearningTrackId,
): boolean {
  if (track === "all") return true;
  return LEARNING_TRACK_MODULES[track].includes(moduleNumber);
}
