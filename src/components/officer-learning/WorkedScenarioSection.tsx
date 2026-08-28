"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ContentBlock, ModuleSection } from "@/lib/officer-learning/types";
import { olTheme } from "@/lib/officer-learning/theme";
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
    return olTheme.dontApplyBox;
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
    <section id={section.id} className={olTheme.scenarioShell}>
      <p className={olTheme.eyebrow}>{t("label")}</p>
      <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">{section.title}</h2>

      <ModuleWorkedTimeline slug={moduleSlug} className="mt-5" />

      <div className="mt-5 space-y-4">
        {section.blocks.map((block, index) => {
          const boxClass =
            block.type === "paragraph" ? scenarioParagraphClass(block.text) : undefined;

          return (
            <div key={`${section.id}-block-${index}`} className={clsx(boxClass)}>
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
          <h3 className={olTheme.subsectionTitle}>{subsection.title}</h3>
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
