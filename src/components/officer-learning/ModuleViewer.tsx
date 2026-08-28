"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ModuleMeta, ParsedModule } from "@/lib/officer-learning/types";
import {
  getModuleProgress,
  markModuleOpened,
  updateScrollDepth,
  OFFICER_LEARNING_PROGRESS_EVENT,
  OFFICER_LEARNING_PROGRESS_KEY,
} from "@/lib/officer-learning/progress";
import { ModuleContentRenderer } from "./ModuleContentRenderer";
import { ModuleQuiz } from "./ModuleQuiz";
import { ModuleToc } from "./ModuleToc";
import { ModuleTeachingDiagram } from "./ModuleTeachingDiagram";
import { ModuleRelatedResources } from "./ModuleRelatedResources";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { olTheme } from "@/lib/officer-learning/theme";
import { scrollQuizIntoView } from "@/lib/officer-learning/quiz-scroll";
import { cn } from "@/lib/utils";

type Props = {
  meta: ModuleMeta;
  module: ParsedModule;
  nextModuleSlug: string | null;
  sourcesPageId: string;
  sourcesTitle: string;
  sourcesIntro: string;
};

export function ModuleViewer({
  meta,
  module,
  nextModuleSlug,
  sourcesPageId,
  sourcesTitle,
  sourcesIntro,
}: Props) {
  const t = useTranslations("officerLearning");
  const articleRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | undefined>();
  const [progress, setProgress] = useState(() => {
    markModuleOpened(meta.id);
    return getModuleProgress(meta.id);
  });

  const handleScroll = useCallback(() => {
    const el = articleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = el.scrollHeight - window.innerHeight;
    const scrolled = Math.min(total, Math.max(0, -rect.top));
    const pct = total > 0 ? (scrolled / total) * 100 : 0;
    setScrollProgress(pct);
    const updated = updateScrollDepth(meta.id, pct);
    setProgress(updated);
  }, [meta.id]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const refreshProgress = () => setProgress(getModuleProgress(meta.id));

    const onStorage = (event: StorageEvent) => {
      if (event.key === OFFICER_LEARNING_PROGRESS_KEY || event.key === null) {
        refreshProgress();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(OFFICER_LEARNING_PROGRESS_EVENT, refreshProgress);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(OFFICER_LEARNING_PROGRESS_EVENT, refreshProgress);
    };
  }, [meta.id]);

  useEffect(() => {
    const headings = module.sections.flatMap((section) => [
      section.id,
      ...(section.subsections?.map((s) => s.id) ?? []),
    ]);
    headings.push("module-quiz");

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.5, 1] },
    );

    for (const id of headings) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [module.sections]);

  const displayProgress = useMemo(
    () => (progress.quizPassed ? 100 : Math.max(progress.scrollDepth, scrollProgress)),
    [progress.quizPassed, progress.scrollDepth, scrollProgress],
  );

  const moduleTitle = t(`modules.${meta.slug}.title`);

  const handleJumpToQuiz = useCallback(() => {
    scrollQuizIntoView(document.getElementById("module-quiz"));
    history.replaceState(null, "", "#module-quiz");
  }, []);

  return (
    <div className={olTheme.shell}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B132B]/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/guide/steward-playbooks"
            className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-orange-400/40 hover:text-white"
          >
            {t("viewer.playbooksNav")}
          </Link>
          <Link
            href="/guide/officer-learning"
            className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-orange-400/40 hover:text-white"
          >
            ← {t("viewer.back")}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-orange-300/90">
              {t("moduleLabel", { number: meta.number })}
            </p>
            <p className="truncate font-semibold text-white">{moduleTitle}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn("h-full rounded-full transition-all duration-300", olTheme.progressBar)}
                style={{ width: `${Math.round(displayProgress)}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-orange-400/40 md:inline-flex"
          >
            {t("viewer.print")}
          </button>
          <button
            type="button"
            onClick={handleJumpToQuiz}
            className="inline-flex shrink-0 rounded-lg bg-opseu-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-opseu-dark"
          >
            {t("viewer.jumpToQuiz")}
          </button>
        </div>
      </header>

      <div className="border-b border-white/10 bg-[#0B132B] px-4 py-2 lg:hidden sm:px-6 print:hidden">
        <details className="rounded-xl border border-white/10 bg-slate-900/60 open:pb-2">
          <summary className={cn("cursor-pointer list-none px-3 py-2 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden", olTheme.linkPlain)}>
            {t("viewer.toc")}
          </summary>
          <div className="max-h-64 overflow-y-auto px-1 pb-2">
            <ModuleToc
              sections={module.sections}
              quizLabel={t("quiz.title")}
              activeId={activeSection}
            />
          </div>
        </details>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-28 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className={cn("mb-3", olTheme.sectionLabel)}>
              {t("viewer.toc")}
            </p>
            <ModuleToc
              sections={module.sections}
              quizLabel={t("quiz.title")}
              activeId={activeSection}
            />
          </div>
        </aside>

        <article ref={articleRef} className="min-w-0 space-y-8">
          <div className={cn(olTheme.callout, "text-sm")}>
            {t("disclaimer")}
          </div>

          {/* Compact related strip (GuideLayout placement) — sticky chrome keeps short nav labels. */}
          <nav className="text-sm" aria-label={t("viewer.relatedLabel")}>
            <p className={cn("font-semibold", olTheme.bodySmall)}>{t("viewer.relatedLabel")}</p>
            <ul className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <li>
                <Link href="/guide/steward-playbooks" className={olTheme.link}>
                  {t("backToPlaybooks")}
                </Link>
              </li>
              <li className="inline-flex items-baseline gap-x-3">
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <Link href="/guide" className={olTheme.link}>
                  {t("backToGuide")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="relative aspect-[21/9] w-full print:hidden">
              <Image
                src={meta.coverSrc}
                alt={moduleTitle}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 70vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-[#0B132B]/20 to-transparent" />
            </div>
            <div className="space-y-4 p-6 md:p-8">
              <p className={olTheme.eyebrow}>
                {t("moduleLabel", { number: meta.number })}
              </p>
              <h1 className="text-3xl font-bold md:text-4xl">{moduleTitle}</h1>
              <p className={olTheme.bodySmall}>
                {t("readingTime", { minutes: meta.readingMinutes })}
              </p>
              <p className="max-w-3xl leading-relaxed text-slate-200">{module.purpose}</p>
              {module.objectives.length > 0 && (
                <ul className="grid gap-2 md:grid-cols-1">
                  {module.objectives.map((objective) => (
                    <li
                      key={objective}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                    >
                      {objective}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={olTheme.callout}>
            <p className={olTheme.calloutTitle}>{t("viewer.quizPreviewTitle")}</p>
            <p className={olTheme.calloutBody}>{t("viewer.quizPreviewBody")}</p>
          </div>

          <ModuleTeachingDiagram slug={meta.slug} />

          <ModuleContentRenderer
            sections={module.sections}
            moduleId={meta.id}
            moduleSlug={meta.slug}
          />

          <ModuleRelatedResources
            slug={meta.slug}
            module={module}
            moduleNumber={meta.number}
            moduleTitle={moduleTitle}
          />

          <ModuleQuiz
            moduleId={meta.id}
            moduleNumber={meta.number}
            moduleTitle={moduleTitle}
            questions={module.quiz}
            nextModuleSlug={nextModuleSlug}
            quizPassed={progress.quizPassed}
            onCompleted={() => setProgress(getModuleProgress(meta.id))}
          />

          <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-lg md:p-8 print:break-before-page">
            <p className="mb-4 text-sm text-gray-600">{sourcesIntro}</p>
            <SourcesBlock pageId={sourcesPageId} title={sourcesTitle} />
          </div>
        </article>
      </div>
    </div>
  );
}
