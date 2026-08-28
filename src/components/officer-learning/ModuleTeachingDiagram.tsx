"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { olTheme } from "@/lib/officer-learning/theme";

type Props = {
  slug: string;
  className?: string;
};

function DiagramShell({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn(olTheme.diagramShell, className)}>
      <figcaption className={cn("mb-4 text-sm font-semibold uppercase tracking-[0.18em]", olTheme.sectionLabel)}>
        {title}
      </figcaption>
      {children}
    </figure>
  );
}

function StepPill({ label, index }: { label: string; index: number }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <span className={olTheme.stepBadge} aria-hidden="true">
        {index}
      </span>
      <span className="text-sm font-medium leading-snug text-slate-100">{label}</span>
    </div>
  );
}

/** Teaching diagrams keyed by module slug — CSS/SVG, no bitmap assets. */
export function ModuleTeachingDiagram({ slug, className }: Props) {
  const t = useTranslations("officerLearning.diagrams");

  if (slug === "contract-enforcement") {
    return (
      <div className={cn("space-y-4", className)}>
        <DiagramShell title={t("filterTitle")}>
          <div
            className="grid gap-2 sm:grid-cols-5"
            role="img"
            aria-label={t("filterAria")}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <StepPill key={n} index={n} label={t(`filter${n}`)} />
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-300">{t("filterCaption")}</p>
        </DiagramShell>
        <DiagramShell title={t("sixWTitle")}>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="img"
            aria-label={t("sixWAria")}
          >
            {(["who", "what", "when", "where", "why", "how"] as const).map(
              (key, i) => (
                <StepPill key={key} index={i + 1} label={t(`sixW.${key}`)} />
              ),
            )}
          </div>
        </DiagramShell>
      </div>
    );
  }

  if (slug === "progressive-discipline") {
    const rungs = ["verbal", "written", "suspension", "discharge"] as const;
    return (
      <DiagramShell title={t("ladderTitle")} className={className}>
        <ol
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          aria-label={t("ladderAria")}
        >
          {rungs.map((rung, index) => (
            <li key={rung} className="flex flex-1 items-center gap-2">
              <div className={olTheme.ladderRung}>
                {t(`ladder.${rung}`)}
              </div>
              {index < rungs.length - 1 ? (
                <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-slate-300">{t("ladderCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "human-rights-accommodation") {
    return (
      <DiagramShell title={t("meiorinTitle")} className={className}>
        <ol className="grid gap-2 sm:grid-cols-3" aria-label={t("meiorinAria")}>
          {([1, 2, 3] as const).map((n) => (
            <li key={n}>
              <StepPill index={n} label={t(`meiorin${n}`)} />
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-slate-300">{t("meiorinCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "democratic-governance") {
    return (
      <DiagramShell title={t("quorumTitle")} className={className}>
        <div className="grid gap-2 sm:grid-cols-3" role="img" aria-label={t("quorumAria")}>
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center"
            >
              <p className={cn("text-xs font-semibold uppercase tracking-wide", olTheme.sectionLabel)}>
                {t(`quorumTier${n}Label`)}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {t(`quorumTier${n}`)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("quorumCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "financial-health") {
    return (
      <DiagramShell title={t("controlsTitle")} className={className}>
        <div
          className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("controlsAria")}
        >
          <StepPill index={1} label={t("controlsReceipt")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("controlsTwoSign")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("controlsAudit")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("controlsCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "building-collective-power") {
    return (
      <DiagramShell title={t("powerTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("powerAria")}
        >
          <StepPill index={1} label={t("powerBarrier")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("powerClause")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("powerAccount")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("powerCaption")}</p>
      </DiagramShell>
    );
  }

  return null;
}
