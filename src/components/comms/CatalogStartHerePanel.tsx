import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CatalogStartHereStep = {
  href: string;
  label: string;
  title: string;
};

type CatalogStartHerePanelProps = {
  title: string;
  intro: string;
  roadmapLabel: string;
  roadmapHref: string;
  steps: readonly CatalogStartHereStep[];
  /** Omit chrome when nested inside the mobile `<details>` drawer. */
  bare?: boolean;
  className?: string;
};

/**
 * Shared start-here rail for `/tools` and `/guides` catalogs.
 */
export function CatalogStartHerePanel({
  title,
  intro,
  roadmapLabel,
  roadmapHref,
  steps,
  bare = false,
  className,
}: CatalogStartHerePanelProps) {
  return (
    <div
      className={cn(
        bare
          ? undefined
          : "rounded-xl border border-opseu-blue/15 bg-gradient-to-b from-opseu-blue/[0.06] to-white p-5",
        className,
      )}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-snug text-gray-700">{intro}</p>
      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="group flex min-h-11 items-start gap-3 rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-opseu-blue/20 hover:bg-white/80"
            >
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-opseu-blue/10 text-xs font-bold text-opseu-blue"
                aria-hidden
              >
                {index + 1}
              </span>
              <span>
                <span className="block font-medium text-opseu-blue underline-offset-2 group-hover:underline">
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  {step.title}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-opseu-blue/10 pt-4">
        <Link
          href={roadmapHref}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline-offset-2 hover:underline"
        >
          {roadmapLabel} →
        </Link>
      </p>
    </div>
  );
}
