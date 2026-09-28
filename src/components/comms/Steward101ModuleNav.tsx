import { GuideCallout } from "@/components/comms/GuideSurfaces";
import { cn } from "@/lib/utils";

export type Steward101ModuleNavItem = {
  href: string;
  number: string;
  title: string;
  time: string;
  summary: string;
};

type Steward101ModuleNavProps = {
  ariaLabel: string;
  timeBudgetTitle: string;
  timeBudgetBody: string;
  modules: readonly Steward101ModuleNavItem[];
  className?: string;
};

/**
 * Compact phase jump strip for Steward 101 — not a second card catalog.
 * TOC remains the canonical in-page nav; this is a short phase rail only.
 */
export function Steward101ModuleNav({
  ariaLabel,
  timeBudgetTitle,
  timeBudgetBody,
  modules,
  className,
}: Steward101ModuleNavProps) {
  return (
    <div className={cn("mb-8 min-w-0", className)}>
      <GuideCallout tone="brand" className="mb-4" measure="fill">
        <p className="font-semibold text-opseu-dark">{timeBudgetTitle}</p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-700">
          {timeBudgetBody}
        </p>
      </GuideCallout>

      <nav aria-label={ariaLabel}>
        <ol className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <li key={module.href}>
              <a
                href={module.href}
                title={module.summary}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:border-opseu-blue hover:bg-opseu-blue/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-[0.65rem] font-bold text-white"
                  aria-hidden="true"
                >
                  {module.number}
                </span>
                <span className="font-semibold text-opseu-dark">
                  {module.title}
                </span>
                <span className="text-[0.65rem] font-medium text-gray-500">
                  {module.time}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
