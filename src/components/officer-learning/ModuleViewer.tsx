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
} from "@/lib/officer-learning/progress";
import { ModuleContentRenderer } from "./ModuleContentRenderer";
import { ModuleQuiz } from "./ModuleQuiz";
import { ModuleToc } from "./ModuleToc";
import { ModuleTeachingDiagram } from "./ModuleTeachingDiagram";
import { ModuleRelatedResources } from "./ModuleRelatedResources";
import { SourcesBlock } from "@/components/comms/SourcesBlock";

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

  return (
    <div className="min-h-screen bg-[#0B132B] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B132B]/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/guide/steward-playbooks"
            className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-400/40 hover:text-white"
          >
            {t("viewer.playbooksNav")}
          </Link>
          <Link
            href="/guide/officer-learning"
            className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-teal-400/40 hover:text-white"
          >
            ← {t("viewer.back")}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-amber-300">
              {t("moduleLabel", { number: meta.number })}
            </p>
            <p className="truncate font-semibold text-white">{moduleTitle}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-400 transition-all duration-300"
                style={{ width: `${Math.round(displayProgress)}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-teal-400/40 md:inline-flex"
          >
            {t("viewer.print")}
          </button>
          <a
            href="#module-quiz"
            className="inline-flex shrink-0 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
          >
            {t("viewer.jumpToQuiz")}
          </a>
        </div>
      </header>

      <div className="border-b border-white/10 bg-[#0B132B] px-4 py-2 lg:hidden sm:px-6 print:hidden">
        <details className="rounded-xl border border-white/10 bg-slate-900/60 open:pb-2">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-teal-200 marker:content-none [&::-webkit-details-marker]:hidden">
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
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
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
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
            {t("disclaimer")}
          </div>

          {/* Compact related strip (GuideLayout placement) — sticky chrome keeps short nav labels. */}
          <nav className="text-sm" aria-label={t("viewer.relatedLabel")}>
            <p className="font-semibold text-teal-200/90">{t("viewer.relatedLabel")}</p>
            <ul className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <li>
                <Link
                  href="/guide/steward-playbooks"
                  className="font-medium text-amber-300/90 underline underline-offset-2 hover:text-amber-200"
                >
                  {t("backToPlaybooks")}
                </Link>
              </li>
              <li className="inline-flex items-baseline gap-x-3">
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <Link
                  href="/guide"
                  className="font-medium text-teal-300 underline underline-offset-2 hover:text-teal-200"
                >
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
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
                {t("moduleLabel", { number: meta.number })}
              </p>
              <h1 className="text-3xl font-bold md:text-4xl">{moduleTitle}</h1>
              <p className="text-sm text-teal-200">
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

          <div className="rounded-xl border border-teal-400/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-50">
            <p className="font-semibold text-teal-100">{t("viewer.quizPreviewTitle")}</p>
            <p className="mt-1 leading-relaxed text-teal-50/90">{t("viewer.quizPreviewBody")}</p>
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
