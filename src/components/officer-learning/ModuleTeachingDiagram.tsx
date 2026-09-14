"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useOlTheme } from "./OlThemeProvider";

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
  const olTheme = useOlTheme();
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
  const olTheme = useOlTheme();
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
  const olTheme = useOlTheme();

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

  if (slug === "mobilizer-bargaining-partner") {
    return (
      <DiagramShell title={t("escalateTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          role="img"
          aria-label={t("escalateAria")}
        >
          <StepPill index={1} label={t("escalateShirt")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("escalateEnforce")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("escalateCampaign")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={4} label={t("escalateRule")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={5} label={t("escalateStrike")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("escalateCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "advanced-grievance-settlement") {
    return (
      <DiagramShell title={t("fileTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          role="img"
          aria-label={t("fileAria")}
        >
          <StepPill index={1} label={t("fileForm")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("fileChrono")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("fileWitness")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={4} label={t("fileEvidence")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={5} label={t("filePolicy")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("fileCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "benefits-disability-claims") {
    return (
      <DiagramShell title={t("privacyTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("privacyAria")}
        >
          <StepPill index={1} label={t("privacyFunctional")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("privacyShield")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("privacyAppeal")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("privacyCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "joint-workplace-committees") {
    return (
      <DiagramShell title={t("routeTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("routeAria")}
        >
          <StepPill index={1} label={t("routeJhsc")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            +
          </span>
          <StepPill index={2} label={t("routeLmc")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            +
          </span>
          <StepPill index={3} label={t("routeGrievance")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("routeCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "membership-lists-privacy") {
    return (
      <DiagramShell title={t("listTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("listAria")}
        >
          <StepPill index={1} label={t("listDues")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("listCard")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("listSecure")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("listCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "advanced-local-finance") {
    return (
      <DiagramShell title={t("expenseTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("expenseAria")}
        >
          <StepPill index={1} label={t("expensePolicy")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("expenseHonoraria")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("expenseHardship")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("expenseCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "digital-security-transitions") {
    return (
      <DiagramShell title={t("archiveTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("archiveAria")}
        >
          <StepPill index={1} label={t("archiveFolders")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("archiveRetain")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("archiveHandover")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("archiveCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "everyday-union-value") {
    return (
      <DiagramShell title={t("welcomeTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("welcomeAria")}
        >
          <StepPill index={1} label={t("welcomeDay1")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("welcomeAffinity")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("welcomeCommunity")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("welcomeCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "duty-of-fair-representation") {
    return (
      <DiagramShell title={t("dfrTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("dfrAria")}
        >
          <StepPill index={1} label={t("dfrInvestigate")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("dfrCommunicate")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("dfrClocks")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("dfrCaption")}</p>
      </DiagramShell>
    );
  }

  if (slug === "seniority-bumping-layoff") {
    return (
      <DiagramShell title={t("bumpingTitle")} className={className}>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="img"
          aria-label={t("bumpingAria")}
        >
          <StepPill index={1} label={t("bumpingList")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={2} label={t("bumpingTree")} />
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            →
          </span>
          <StepPill index={3} label={t("bumpingClocks")} />
        </div>
        <p className="mt-3 text-sm text-slate-300">{t("bumpingCaption")}</p>
      </DiagramShell>
    );
  }

  return null;
}
