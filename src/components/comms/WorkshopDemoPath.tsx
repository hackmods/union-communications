"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const STEPS = [
  { href: "/brand-kit", labelKey: "stepBrand" as const },
  { href: "/tools/board-notice", labelKey: "stepBoard" as const },
  { href: "/tools/graphic-maker", labelKey: "stepGraphic" as const },
  { href: "/captions", labelKey: "stepCaptions" as const },
] as const;

type WorkshopDemoPathProps = {
  className?: string;
  showRoadmapLink?: boolean;
};

/**
 * Compact “demo in ~20 minutes” path for home + First week workshop surfaces.
 */
export function WorkshopDemoPath({
  className,
  showRoadmapLink = true,
}: WorkshopDemoPathProps) {
  const t = useTranslations("workshopDemo");

  return (
    <section className={className} aria-labelledby="workshop-demo-heading">
      <h2
        id="workshop-demo-heading"
        className="text-sm font-semibold uppercase tracking-wide text-gray-500"
      >
        {t("title")}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-gray-600">{t("intro")}</p>
      <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
        {STEPS.map((step, i) => (
          <li
            key={step.href}
            className="inline-flex items-center gap-1 sm:gap-2"
          >
            {i > 0 ? (
              <span className="hidden text-gray-400 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
            <Link
              href={step.href}
              className="inline-flex min-h-11 items-center rounded-lg border border-opseu-blue/20 bg-opseu-blue/5 px-3 text-sm font-semibold text-opseu-blue underline-offset-2 hover:underline"
            >
              <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white">
                {i + 1}
              </span>
              {t(step.labelKey)}
            </Link>
          </li>
        ))}
      </ol>
      {showRoadmapLink ? (
        <p className="mt-3">
          <Link
            href="/guide/social-media-plan"
            className="text-sm font-medium text-opseu-blue underline-offset-2 hover:underline"
          >
            {t("openRoadmap")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
