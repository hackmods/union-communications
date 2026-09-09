"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ModuleMeta } from "@/lib/officer-learning/types";
import {
  getAllProgress,
  markModuleOpened,
  resetAllProgress,
  statusLabelKey,
  OFFICER_LEARNING_PROGRESS_EVENT,
  OFFICER_LEARNING_PROGRESS_KEY,
} from "@/lib/officer-learning/progress";
import { CertificateDownload } from "./CertificateDownload";
import { LearningHubSyncPanel } from "./LearningHubSyncPanel";
import { LearningPathDiagram } from "./LearningPathDiagram";
import {
  LearningTrackPicker,
  moduleInTrack,
  type LearningTrackId,
} from "./LearningTrackPicker";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { OlThemeProvider, useOlTheme } from "./OlThemeProvider";
import clsx from "clsx";
import { cn } from "@/lib/utils";

type Props = {
  modules: ModuleMeta[];
  sourcesIntro: string;
  sourcesTitle: string;
  sourcesCatalogIntro: string;
};

const RELATED_LINKS = [
  { href: "/guide/steward-playbooks", key: "backToPlaybooks" as const },
  { href: "/guide", key: "backToGuide" as const },
  { href: "/app/officer-learning", key: "hubBoardLink" as const },
] as const;

export function OfficerLearningDashboard(props: Props) {
  return (
    <OlThemeProvider>
      <OfficerLearningDashboardInner {...props} />
    </OlThemeProvider>
  );
}

function OfficerLearningDashboardInner({
  modules,
  sourcesIntro,
  sourcesTitle,
  sourcesCatalogIntro,
}: Props) {
  const t = useTranslations("officerLearning");
  const olTheme = useOlTheme();
  const [progress, setProgress] = useState(getAllProgress);
  const [confirmReset, setConfirmReset] = useState(false);
  const [track, setTrack] = useState<LearningTrackId>("all");

  const completedCount = useMemo(
    () => modules.filter((m) => progress[m.id]?.status === "completed").length,
    [modules, progress],
  );

  const visibleModules = useMemo(
    () => modules.filter((m) => moduleInTrack(m.number, track)),
    [modules, track],
  );

  const handleProgressHydrated = (next: ReturnType<typeof getAllProgress>) => {
    setProgress(next);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetAllProgress();
    setProgress({});
    setConfirmReset(false);
  };

  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), 5000);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  useEffect(() => {
    const refresh = () => setProgress(getAllProgress());

    const onStorage = (event: StorageEvent) => {
      if (event.key === OFFICER_LEARNING_PROGRESS_KEY || event.key === null) {
        refresh();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(OFFICER_LEARNING_PROGRESS_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(OFFICER_LEARNING_PROGRESS_EVENT, refresh);
    };
  }, []);

  return (
    <>
      <div className={olTheme.shell} data-ol-shell>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <header className="mb-10 grid gap-8 lg:mb-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-10">
            <div className="min-w-0 space-y-4">
              <p className={olTheme.eyebrow}>{t("eyebrow")}</p>
              <h1
                className={cn(
                  "text-[clamp(2rem,1.5rem+2vw,3rem)] font-bold tracking-tight",
                  olTheme.heading,
                )}
              >
                {t("title")}
              </h1>
              <p className={cn("max-w-prose text-lg leading-relaxed", olTheme.bodyMuted)}>
                {t("intro")}
              </p>
              <p className={olTheme.progressSummary}>
                {t("progressSummary", {
                  completed: completedCount,
                  total: modules.length,
                })}
              </p>
              <nav className="text-sm" aria-label={t("relatedNavLabel")}>
                <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {RELATED_LINKS.map((link, i) => (
                    <li
                      key={link.href}
                      className="inline-flex items-baseline gap-x-3"
                    >
                      {i > 0 && (
                        <span className={olTheme.relatedDot} aria-hidden="true">
                          ·
                        </span>
                      )}
                      <Link href={link.href} className={olTheme.link}>
                        {t(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="space-y-4">
              <div className={olTheme.callout}>
                <p className={olTheme.calloutTitle}>{t("quizHint.title")}</p>
                <p className={olTheme.calloutBody}>{t("quizHint.body")}</p>
              </div>
              <p className={olTheme.disclaimer}>{t("disclaimer")}</p>
            </div>
          </header>

          <LearningTrackPicker active={track} onChange={setTrack} className="mb-8" />

          <LearningPathDiagram
            className="mb-8"
            label={t("path.label")}
            steps={modules
              .filter((module) => moduleInTrack(module.number, track))
              .map((module) => {
                const title = t(`modules.${module.slug}.title`);
                return {
                  id: module.id,
                  number: module.number,
                  title,
                  ariaLabel: t("path.stepAria", {
                    number: module.number,
                    title,
                  }),
                  href: `/guide/officer-learning/${module.slug}`,
                  status: progress[module.id]?.status ?? "not_started",
                };
              })}
          />

          <section
            className={cn(olTheme.prefsPanel, "mb-8 grid gap-6 lg:grid-cols-2")}
            aria-labelledby="ol-progress-prefs-heading"
          >
            <div className="space-y-4">
              <div>
                <h2
                  id="ol-progress-prefs-heading"
                  className={olTheme.prefsTitle}
                >
                  {t("progressPrefs.title")}
                </h2>
                <p className={olTheme.prefsBody}>{t("progressPrefs.body")}</p>
              </div>
              <div className={olTheme.resetPanel}>
                <p className={olTheme.resetHint}>{t("settings.hint")}</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className={clsx(
                    confirmReset ? olTheme.resetBtnConfirm : olTheme.resetBtn,
                  )}
                >
                  {confirmReset
                    ? t("settings.confirmReset")
                    : t("settings.reset")}
                </button>
              </div>
            </div>
            <div>
              <p className={cn("mb-2 text-sm font-semibold", olTheme.bodySmall)}>
                {t("hubSync.panelLabel")}
              </p>
              <LearningHubSyncPanel
                onProgressHydrated={handleProgressHydrated}
              />
            </div>
          </section>

          {completedCount === modules.length && modules.length > 0 && (
            <div className="mb-8">
              <CertificateDownload
                kind="path"
                achievementTitle={t("certificate.pathTitle")}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {visibleModules.map((module) => {
              const moduleProgress = progress[module.id];
              const status = moduleProgress?.status ?? "not_started";
              const summaryKey = `modules.${module.slug}.summary` as const;
              const titleId = `module-card-title-${module.id}`;

              return (
                <Link
                  key={module.id}
                  href={`/guide/officer-learning/${module.slug}`}
                  aria-labelledby={titleId}
                  className={olTheme.card}
                  onClick={() => {
                    markModuleOpened(module.id);
                  }}
                >
                  <div className={olTheme.cardCover}>
                    <Image
                      src={module.coverSrc}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                    <div className={olTheme.coverFade} />
                    <span className="absolute left-4 top-4 rounded-full bg-opseu-blue px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                      {t("moduleLabel", { number: module.number })}
                    </span>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 id={titleId} className={olTheme.cardTitle}>
                        {t(`modules.${module.slug}.title`)}
                      </h2>
                      <span
                        className={clsx(
                          status === "completed" && olTheme.statusPillCompleted,
                          status === "in_progress" && olTheme.statusPillInProgress,
                          status === "not_started" && olTheme.statusPillNotStarted,
                        )}
                        aria-hidden="true"
                      >
                        {status === "completed"
                          ? t("progress.completedPercent")
                          : t(statusLabelKey(status))}
                      </span>
                    </div>
                    <p className={olTheme.cardSummary} aria-hidden="true">
                      {t(summaryKey)}
                    </p>
                    <p className={olTheme.cardMeta} aria-hidden="true">
                      {t("readingTime", { minutes: module.readingMinutes })}
                      {" · "}
                      {t("moduleQuizBadge")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className={olTheme.sourcesOuter} data-ol-shell>
        <div className={olTheme.sourcesCard}>
          <p className={olTheme.sourcesIntro}>{sourcesIntro}</p>
          <SourcesBlock
            pageId="officerLearning"
            title={sourcesTitle}
            intro={sourcesCatalogIntro}
          />
        </div>
      </div>
    </>
  );
}
