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

/** Four-module jump grid for Steward 101 — replaces long pill TOC. */
export function Steward101ModuleNav({
  ariaLabel,
  timeBudgetTitle,
  timeBudgetBody,
  modules,
  className,
}: Steward101ModuleNavProps) {
  return (
    <div className={cn("mb-8 min-w-0", className)}>
      <GuideCallout tone="brand" className="mb-5" measure="fill">
        <p className="font-semibold text-opseu-dark">{timeBudgetTitle}</p>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {timeBudgetBody}
        </p>
      </GuideCallout>

      <nav aria-label={ariaLabel}>
        <ol className="grid gap-3 sm:grid-cols-2">
          {modules.map((module) => (
            <li key={module.href}>
              <a
                href={module.href}
                className="flex h-full min-h-11 flex-col border-l-2 border-opseu-blue/30 bg-white py-3 pl-4 transition-colors hover:border-opseu-blue hover:bg-opseu-blue/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white"
                    aria-hidden="true"
                  >
                    {module.number}
                  </span>
                  <span className="font-semibold text-opseu-dark">
                    {module.title}
                  </span>
                  <span className="ml-auto text-[0.65rem] font-semibold uppercase tracking-wide text-gray-600">
                    {module.time}
                  </span>
                </span>
                <span className="mt-2 text-sm leading-snug text-gray-600">
                  {module.summary}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
