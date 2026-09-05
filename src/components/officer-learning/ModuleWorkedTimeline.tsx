"use client";

import { useTranslations } from "next-intl";
import { useOlTheme } from "./OlThemeProvider";
import clsx from "clsx";

/** Day-phase keys per module — grievance-process worked-file spacing (D0–D7). */
export const MODULE_TIMELINE_PHASES: Record<string, readonly string[]> = {
  "contract-enforcement": ["d0", "d1", "d2", "d3", "d7"],
  "progressive-discipline": ["d0", "d1", "d2", "d3", "d7"],
  "human-rights-accommodation": ["d0", "d1", "d3", "d5", "d7"],
  "democratic-governance": ["d0", "d1", "d2", "d3"],
  "financial-health": ["d0", "d1", "d3", "d7"],
  "building-collective-power": ["d0", "d1", "d3", "d7"],
};

type Props = {
  slug: string;
  className?: string;
};

/** Visual D0–D7-style timeline for module worked scenarios. */
export function ModuleWorkedTimeline({ slug, className }: Props) {
  const phases = MODULE_TIMELINE_PHASES[slug];
  const t = useTranslations(`officerLearning.timelines.${slug}`);
  const olTheme = useOlTheme();

  if (!phases?.length) return null;

  return (
    <figure className={clsx(olTheme.timelineShell, className)}>
      <h3 className={clsx("mb-4", olTheme.sectionLabel)}>{t("title")}</h3>
      <ol
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2"
        aria-label={t("aria")}
      >
        {phases.map((key, index) => (
          <li key={key} className="flex min-w-0 flex-1 items-stretch gap-2 sm:flex-col">
            <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <span className={olTheme.phaseLabel}>{key.toUpperCase()}</span>
              <p className="mt-1 text-sm font-semibold leading-snug text-white">
                {t(`phases.${key}.label`)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {t(`phases.${key}.summary`)}
              </p>
            </div>
            {index < phases.length - 1 ? (
              <span className={olTheme.phaseArrow} aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">{t("caption")}</p>
    </figure>
  );
}
