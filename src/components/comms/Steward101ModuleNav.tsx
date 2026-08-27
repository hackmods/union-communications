import { Callout } from "@/components/ui/Callout";
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
    <div className={cn("mb-8 max-w-3xl", className)}>
      <Callout tone="brand" className="mb-5">
        <p className="font-semibold text-opseu-dark">{timeBudgetTitle}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{timeBudgetBody}</p>
      </Callout>

      <nav aria-label={ariaLabel}>
        <ol className="grid gap-3 sm:grid-cols-2">
          {modules.map((module) => (
            <li key={module.href}>
              <a
                href={module.href}
                className="flex h-full min-h-11 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white"
                    aria-hidden="true"
                  >
                    {module.number}
                  </span>
                  <span className="font-semibold text-opseu-dark">{module.title}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-gray-600">
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
