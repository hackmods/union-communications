"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ModuleMeta } from "@/lib/officer-learning/types";
import {
  getAllProgress,
  markModuleOpened,
  resetAllProgress,
  statusLabelKey,
} from "@/lib/officer-learning/progress";
import { CertificateDownload } from "./CertificateDownload";
import { LearningHubSyncPanel } from "./LearningHubSyncPanel";
import { LearningPathDiagram } from "./LearningPathDiagram";
import clsx from "clsx";

type Props = {
  modules: ModuleMeta[];
};

const RELATED_LINKS = [
  { href: "/guide/steward-playbooks", key: "backToPlaybooks" as const },
  { href: "/guide", key: "backToGuide" as const },
  { href: "/app/officer-learning", key: "hubBoardLink" as const },
] as const;

export function OfficerLearningDashboard({ modules }: Props) {
  const t = useTranslations("officerLearning");
  const [progress, setProgress] = useState(getAllProgress);
  const [confirmReset, setConfirmReset] = useState(false);

  const completedCount = useMemo(
    () => modules.filter((m) => progress[m.id]?.status === "completed").length,
    [modules, progress],
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

  return (
    <div className="min-h-screen bg-[#0B132B] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{t("intro")}</p>
          <p className="mt-4 text-sm text-teal-200/90">
            {t("progressSummary", { completed: completedCount, total: modules.length })}
          </p>
          <div className="mt-4 rounded-xl border border-teal-400/30 bg-teal-500/10 px-4 py-3">
            <p className="font-semibold text-teal-100">{t("quizHint.title")}</p>
            <p className="mt-1 text-sm leading-relaxed text-teal-50/90">{t("quizHint.body")}</p>
          </div>
          <p className="mt-3 text-sm text-amber-100/90">{t("disclaimer")}</p>
        </header>

        {/* GuideLayout-style related strip — dark tokens kept (accepted exception). */}
        <nav className="mb-10 text-sm" aria-label={t("relatedNavLabel")}>
          <p className="font-semibold text-amber-200/90">{t("relatedNavLabel")}</p>
          <ul className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {RELATED_LINKS.map((link, i) => (
              <li key={link.href} className="inline-flex items-baseline gap-x-3">
                {i > 0 && (
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                )}
                <Link
                  href={link.href}
                  className="font-medium text-teal-300 underline underline-offset-2 hover:text-amber-200"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <LearningPathDiagram
          className="mb-8"
          label={t("path.label")}
          steps={modules.map((module) => {
            const title = t(`modules.${module.slug}.title`);
            return {
              id: module.id,
              number: module.number,
              title,
              ariaLabel: t("path.stepAria", { number: module.number, title }),
              href: `/guide/officer-learning/${module.slug}`,
              status: progress[module.id]?.status ?? "not_started",
            };
          })}
        />

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">{t("settings.hint")}</p>
            <button
              type="button"
              onClick={handleReset}
              className={clsx(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                confirmReset
                  ? "bg-red-500 text-white hover:bg-red-400"
                  : "border border-white/15 bg-transparent text-slate-200 hover:border-amber-400/40",
              )}
            >
              {confirmReset ? t("settings.confirmReset") : t("settings.reset")}
            </button>
          </div>
          <LearningHubSyncPanel onProgressHydrated={handleProgressHydrated} />
        </div>

        {completedCount === modules.length && modules.length > 0 && (
          <div className="mb-8">
            <CertificateDownload
              kind="path"
              achievementTitle={t("certificate.pathTitle")}
            />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const moduleProgress = progress[module.id];
            const status = moduleProgress?.status ?? "not_started";
            const summaryKey = `modules.${module.slug}.summary` as const;
            const titleId = `module-card-title-${module.id}`;

            return (
              <Link
                key={module.id}
                href={`/guide/officer-learning/${module.slug}`}
                aria-labelledby={titleId}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-lg transition hover:-translate-y-1 hover:border-teal-400/40 hover:shadow-teal-500/10"
                onClick={() => {
                  markModuleOpened(module.id);
                }}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                  <Image
                    src={module.coverSrc}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
                    {t("moduleLabel", { number: module.number })}
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2
                      id={titleId}
                      className="text-xl font-bold text-white group-hover:text-teal-100"
                    >
                      {t(`modules.${module.slug}.title`)}
                    </h2>
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        status === "completed" && "bg-emerald-500/20 text-emerald-200",
                        status === "in_progress" && "bg-teal-500/20 text-teal-100",
                        status === "not_started" && "bg-white/10 text-slate-300",
                      )}
                      aria-hidden="true"
                    >
                      {status === "completed"
                        ? t("progress.completedPercent")
                        : t(statusLabelKey(status))}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-300" aria-hidden="true">
                    {t(summaryKey)}
                  </p>
                  <p
                    className="text-xs font-medium uppercase tracking-wide text-amber-300/90"
                    aria-hidden="true"
                  >
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
  );
}
