"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconChip } from "@/components/ui/IconChip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageShell } from "@/components/layout/PageShell";
import {
  EMPTY_START_PATH_PROGRESS,
  isStartPathId,
  parseStartPathProgress,
  START_PATH_PROGRESS_KEY,
  START_PATHS,
  toggleStartPathStep,
  type StartPathId,
  type StartPathProgress,
} from "@/lib/comms/start-paths";

export function StartContent({ initialPath }: { initialPath?: string }) {
  const t = useTranslations("publicCatalog");
  const nav = useTranslations("nav");
  const brandKit = useBrandStore((state) => state.brandKit);
  const onboardingComplete = useBrandStore((state) => state.onboardingComplete);
  const hydrated = useBrandStore((state) => state.hydrated);
  const brandReady = hydrated && isBrandThemeEstablished(brandKit, onboardingComplete);
  const [progress, setProgress] = useState<StartPathProgress>(EMPTY_START_PATH_PROGRESS);
  const [selectedPath, setSelectedPath] = useState<StartPathId | null>(
    initialPath && isStartPathId(initialPath) ? initialPath : null,
  );
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const { data: session, status } = useSession();
  const hubAvailable =
    (status === "authenticated" && Boolean(session?.user)) || isOfficerHubPublic();

  const saveProgress = (next: StartPathProgress) => {
    setProgress(next);
    try {
      window.localStorage.setItem(START_PATH_PROGRESS_KEY, JSON.stringify(next));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  };

  const syncPathInUrl = useCallback((pathId: StartPathId | null, historyMode: "push" | "replace") => {
    const url = new URL(window.location.href);
    if (pathId) url.searchParams.set("path", pathId);
    else url.searchParams.delete("path");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history[historyMode === "push" ? "pushState" : "replaceState"](
      window.history.state,
      "",
      next,
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let restored = EMPTY_START_PATH_PROGRESS;
      try {
        restored = parseStartPathProgress(window.localStorage.getItem(START_PATH_PROGRESS_KEY));
      } catch {
        setStorageAvailable(false);
      }
      const queryPath = initialPath && isStartPathId(initialPath) ? initialPath : null;
      const selected = queryPath ?? restored.selectedPath;
      restored = { ...restored, selectedPath: selected };
      setProgress(restored);
      setSelectedPath(selected);
      setProgressLoaded(true);
      if (selected && !queryPath) syncPathInUrl(selected, "replace");
    }, 0);

    const restorePathFromUrl = () => {
      const path = new URLSearchParams(window.location.search).get("path");
      if (path && isStartPathId(path)) setSelectedPath(path);
      else setSelectedPath(null);
    };
    window.addEventListener("popstate", restorePathFromUrl);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", restorePathFromUrl);
    };
  }, [initialPath, syncPathInUrl]);

  const paths = [
    {
      id: "comms",
      title: t("startPaths.commsTitle"),
      body: t("startPaths.commsBody"),
      href: brandReady ? "/learn/first-week" : "/create/brand-kit",
      cta: t(brandReady ? "startPaths.commsCta" : "brandSetupTitle"),
      mark: "C",
      tone: "brand" as const,
    },
    {
      id: "steward",
      title: t("startPaths.stewardTitle"),
      body: t("startPaths.stewardBody"),
      href: "/learn/steward",
      cta: t("startPaths.stewardCta"),
      mark: "S",
      tone: "amber" as const,
    },
    {
      id: "officer",
      title: t("startPaths.officerTitle"),
      body: t("startPaths.officerBody"),
      href: "/learn/officer",
      cta: t("startPaths.officerCta"),
      mark: "O",
      tone: "brand" as const,
    },
  ];

  const journeys = {
    comms: START_PATHS.comms,
    steward: START_PATHS.steward,
    officer: START_PATHS.officer,
  } as const;
  const selectedJourney = selectedPath ? journeys[selectedPath] : null;
  const journeyDoneCount = selectedPath && selectedJourney
    ? selectedJourney.filter((step) =>
        (selectedPath === "comms" && step.id === "brand" && brandReady) ||
        progress.completedStepIds[selectedPath].includes(step.id),
      ).length
    : 0;
  const journeyNextStep = selectedJourney?.find((step) =>
    !(selectedPath === "comms" && step.id === "brand" && brandReady) &&
    !progress.completedStepIds[selectedPath!].includes(step.id),
  );

  const choosePath = (pathId: StartPathId) => {
    setSelectedPath(pathId);
    const next = { ...progress, selectedPath: pathId };
    saveProgress(next);
    syncPathInUrl(pathId, "push");
  };

  const toggleStep = (pathId: StartPathId, stepId: string) => {
    const next = toggleStartPathStep(progress, pathId, stepId);
    saveProgress(next);
  };

  const clearProgress = () => {
    const next = { ...EMPTY_START_PATH_PROGRESS, selectedPath };
    saveProgress(next);
  };

  return (
    <PageShell className="py-8 md:py-12">
      <header className="max-w-3xl">
        <Eyebrow>{t("startEyebrow")}</Eyebrow>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-opseu-dark sm:text-4xl">
          {t("startTitle")}
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700 sm:text-lg">
          {t("startIntro")}
        </p>
      </header>

      {brandReady ? (
        <Card variant="ghost" className="mt-8 flex flex-col gap-4 border-opseu-blue/25 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Eyebrow tone="success">{t("brandSetupCompleteTitle")}</Eyebrow>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
              {t("brandSetupCompleteBody")}
            </p>
          </div>
          <ButtonLink href="/learn/first-week" className="shrink-0">
            {nav("firstWeek")}
          </ButtonLink>
        </Card>
      ) : hydrated ? (
        <Card variant="ghost" className="mt-8 flex flex-col gap-4 border-opseu-blue/25 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Eyebrow>{t("brandSetupTitle")}</Eyebrow>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
              {t("brandSetupBody")}
            </p>
          </div>
          <ButtonLink href="/create/brand-kit" className="shrink-0">
            {nav("brandKit")}
          </ButtonLink>
        </Card>
      ) : null}

      <section className="mt-10" aria-labelledby="start-paths-heading">
        <SectionHeading
          id="start-paths-heading"
          title={t("startCta")}
        />
        <ul className="mt-6 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {paths.map((path) => (
            <li key={path.id} className="min-w-0" data-testid={`start-path-${path.id}`}>
              <Card variant="elevated" interactive className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <IconChip tone={path.tone}>{path.mark}</IconChip>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {t(`audiences.${path.id === "comms" ? "comms" : path.id}`)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-opseu-dark">{path.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{path.body}</p>
                </div>
                <div className="mt-auto pt-2">
                  <ButtonLink href={path.href} variant={path.id === "comms" ? "primary" : "outline"}>
                    {path.cta}
                  </ButtonLink>
                  <button
                    type="button"
                    onClick={() => choosePath(path.id as StartPathId)}
                    aria-pressed={selectedPath === path.id}
                    className="mt-2 inline-flex min-h-10 items-center rounded-md px-2 text-sm font-semibold text-opseu-blue underline underline-offset-2 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
                  >
                    {selectedPath === path.id ? t("journeyStepsTitle") : t("viewPathSteps")}
                  </button>
                  {path.id === "officer" && hubAvailable ? (
                    <Link
                      href="/app"
                      className="mt-3 inline-flex min-h-10 items-center font-semibold text-opseu-blue underline underline-offset-2 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
                    >
                      {t("startPaths.hubCta")}
                    </Link>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {selectedPath && selectedJourney ? (
        <section className="mt-10" aria-labelledby="start-journey-heading" data-testid="start-guided-journey">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Eyebrow>{t("journeyNextStep")}</Eyebrow>
                <h2 id="start-journey-heading" className="mt-1 text-2xl font-bold text-opseu-dark">
                  {t(`startPaths.${selectedPath}Title` as never)}
                </h2>
                <p role="status" aria-live="polite" className="mt-2 text-sm font-medium text-slate-700">
                  {t("journeyProgress", { done: journeyDoneCount, total: selectedJourney.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={clearProgress}
                className="inline-flex min-h-10 w-fit items-center rounded-md px-2 text-sm font-semibold text-opseu-blue underline underline-offset-2 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
              >
                {t("journeyClearProgress")}
              </button>
            </header>

            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={t("journeyProgress", { done: journeyDoneCount, total: selectedJourney.length })}
              aria-valuemin={0}
              aria-valuemax={selectedJourney.length}
              aria-valuenow={journeyDoneCount}
            >
              <div
                className="h-full rounded-full bg-opseu-blue transition-[width]"
                style={{ width: `${(journeyDoneCount / selectedJourney.length) * 100}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {progressLoaded && storageAvailable ? t("journeyStorage") : null}
              {progressLoaded && !storageAvailable ? t("journeyStorageUnavailable") : null}
            </p>

            <ol className="mt-5 grid list-none gap-3 p-0 md:grid-cols-2">
              {selectedJourney.map((step, index) => {
                const brandKitStep = selectedPath === "comms" && step.id === "brand";
                const done = (brandKitStep && brandReady) ||
                  progress.completedStepIds[selectedPath].includes(step.id);
                const isNext = journeyNextStep?.id === step.id;
                return (
                  <li key={step.id} className="min-w-0">
                    <Card variant="ghost" className={`h-full ${isNext ? "border-opseu-blue/40 bg-opseu-blue/[0.03]" : ""}`}>
                      <div className="flex h-full flex-col">
                        <div className="flex items-start gap-3">
                          <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                            {done ? "✓" : index + 1}
                          </span>
                          <div>
                            {isNext ? <Eyebrow>{t("journeyNextStep")}</Eyebrow> : null}
                            <h3 className="font-bold text-opseu-dark">
                              {t(`startJourneys.${selectedPath}.${step.id}.title` as never)}
                            </h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                              {t(`startJourneys.${selectedPath}.${step.id}.body` as never)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
                          <ButtonLink href={step.href} variant={isNext ? "primary" : "outline"}>
                            {t("journeyOpenStep")}
                          </ButtonLink>
                          {brandKitStep ? (
                            <span className="text-sm text-slate-600">
                              {done ? t("brandSetupCompleteTitle") : t("brandSetupTitle")}
                            </span>
                          ) : (
                            <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => toggleStep(selectedPath, step.id)}
                                className="size-4 rounded border-slate-400 text-opseu-blue focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
                                aria-label={t(done ? "journeyStepNotDone" : "journeyStepDone")}
                              />
                              {done ? t("journeyStepNotDone") : t("journeyStepDone")}
                            </label>
                          )}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
