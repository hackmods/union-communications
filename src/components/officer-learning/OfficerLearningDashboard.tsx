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
import clsx from "clsx";

type Props = {
  modules: ModuleMeta[];
};

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
        <header className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{t("intro")}</p>
          <p className="mt-4 text-sm text-teal-200/90">
            {t("progressSummary", { completed: completedCount, total: modules.length })}
          </p>
        </header>

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

            return (
              <Link
                key={module.id}
                href={`/guide/officer-learning/${module.slug}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-lg transition hover:-translate-y-1 hover:border-teal-400/40 hover:shadow-teal-500/10"
                onClick={() => {
                  markModuleOpened(module.id);
                }}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                  <Image
                    src={module.coverSrc}
                    alt={t(`modules.${module.slug}.title`)}
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
                    <h2 className="text-xl font-bold text-white group-hover:text-teal-100">
                      {t(`modules.${module.slug}.title`)}
                    </h2>
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        status === "completed" && "bg-emerald-500/20 text-emerald-200",
                        status === "in_progress" && "bg-teal-500/20 text-teal-100",
                        status === "not_started" && "bg-white/10 text-slate-300",
                      )}
                    >
                      {status === "completed"
                        ? t("progress.completedPercent")
                        : t(statusLabelKey(status))}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-300">
                    {t(summaryKey)}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-300/90">
                    {t("readingTime", { minutes: module.readingMinutes })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-10 space-y-2 text-sm text-slate-400">
          <Link href="/guide" className="block font-medium text-teal-300 underline underline-offset-2">
            ← {t("backToGuide")}
          </Link>
          <Link
            href="/app/officer-learning"
            className="block font-medium text-amber-300/90 underline underline-offset-2"
          >
            {t("hubBoardLink")} →
          </Link>
        </p>
      </div>
    </div>
  );
}
