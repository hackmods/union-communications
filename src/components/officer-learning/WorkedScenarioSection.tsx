"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ContentBlock, ModuleSection } from "@/lib/officer-learning/types";
import clsx from "clsx";
import { ModuleWorkedTimeline } from "./ModuleWorkedTimeline";

type BlockRendererProps = {
  block: ContentBlock;
  checklistKey: string;
  renderBlock: (props: BlockRendererProps) => ReactNode;
};

type Props = {
  section: ModuleSection;
  moduleId: string;
  moduleSlug: string;
  renderBlock: (props: BlockRendererProps) => ReactNode;
};

function scenarioParagraphClass(text: string): string | undefined {
  if (text.startsWith("**Apply:**")) {
    return "rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-emerald-50";
  }
  if (text.startsWith("**Don't apply:**") || text.startsWith("**Do not apply:**")) {
    return "rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-amber-50";
  }
  return undefined;
}

/** Distinct visual frame for module worked scenarios (Apply / Don't apply). */
export function WorkedScenarioSection({
  section,
  moduleId,
  moduleSlug,
  renderBlock,
}: Props) {
  const t = useTranslations("officerLearning.workedScenario");

  return (
    <section
      id={section.id}
      className="scroll-mt-32 overflow-hidden rounded-2xl border-2 border-amber-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-6 shadow-lg md:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
        {t("label")}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">{section.title}</h2>

      <ModuleWorkedTimeline slug={moduleSlug} className="mt-5" />

      <div className="mt-5 space-y-4">
        {section.blocks.map((block, index) => {
          const boxClass =
            block.type === "paragraph" ? scenarioParagraphClass(block.text) : undefined;

          return (
            <div
              key={`${section.id}-block-${index}`}
              className={clsx(boxClass)}
            >
              {renderBlock({
                block,
                checklistKey: `ol-check:${moduleId}:${section.id}:${index}`,
                renderBlock,
              })}
            </div>
          );
        })}
      </div>
      {section.subsections?.map((subsection) => (
        <div
          key={subsection.id}
          id={subsection.id}
          className="scroll-mt-32 mt-6 space-y-3 border-t border-white/10 pt-6"
        >
          <h3 className="text-xl font-semibold text-teal-200">{subsection.title}</h3>
          <div className="space-y-4">
            {subsection.blocks.map((block, index) => (
              <div key={`${subsection.id}-block-${index}`}>
                {renderBlock({
                  block,
                  checklistKey: `ol-check:${moduleId}:${subsection.id}:${index}`,
                  renderBlock,
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
