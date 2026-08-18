"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { WorkshopDemoJoinLink } from "@/components/comms/WorkshopDemoJoinLink";
import {
  useWorkshopDemoQuartetComplete,
  useWorkshopDemoStepVisit,
} from "@/hooks/use-workshop-demo-session";
import { WORKSHOP_DEMO_WEBSITE_HREF } from "@/lib/comms/workshop-demo-session";

export const WORKSHOP_DEMO_STEPS = [
  { href: "/brand-kit", labelKey: "stepBrand" as const },
  { href: "/tools/board-notice", labelKey: "stepBoard" as const },
  { href: "/tools/graphic-maker", labelKey: "stepGraphic" as const },
  { href: "/captions", labelKey: "stepCaptions" as const },
] as const;

const WEBSITE_STEP = {
  href: WORKSHOP_DEMO_WEBSITE_HREF,
  labelKey: "stepWebsite" as const,
};

type WorkshopDemoPathProps = {
  className?: string;
  showRoadmapLink?: boolean;
  /**
   * `card` is the First week / home pitch.
   * `trail` is the quiet continuation on the demo tools.
   */
  variant?: "card" | "trail";
};

function isCurrentDemoStep(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Compact “demo in ~20 minutes” path for home + First week, plus a quiet
 * in-tool trail. Website Template appears as stop 5 only after the first four.
 */
export function WorkshopDemoPath({
  className,
  showRoadmapLink = true,
  variant = "card",
}: WorkshopDemoPathProps) {
  const t = useTranslations("workshopDemo");
  const pathname = usePathname();
  const quartetComplete = useWorkshopDemoQuartetComplete();
  useWorkshopDemoStepVisit(variant === "trail");

  if (variant === "trail") {
    const trailSteps = quartetComplete
      ? [...WORKSHOP_DEMO_STEPS, WEBSITE_STEP]
      : WORKSHOP_DEMO_STEPS;
    const currentHref = trailSteps.find((step) =>
      isCurrentDemoStep(pathname, step.href),
    )?.href;

    return (
      <div className={className}>
        <nav aria-label={t("trailNavLabel")}>
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {trailSteps.map((step, i) => {
              const current = step.href === currentHref;
              return (
                <li
                  key={step.href}
                  className="inline-flex items-center gap-1"
                >
                  {i > 0 ? (
                    <span className="text-gray-400" aria-hidden>
                      →
                    </span>
                  ) : null}
                  {current ? (
                    <span
                      aria-current="page"
                      className="inline-flex min-h-11 items-center font-semibold text-opseu-dark"
                    >
                      {t(step.labelKey)}
                    </span>
                  ) : (
                    <WorkshopDemoJoinLink
                      href={step.href}
                      className="inline-flex min-h-11 items-center text-gray-600 underline-offset-2 hover:text-opseu-blue hover:underline"
                    >
                      {t(step.labelKey)}
                    </WorkshopDemoJoinLink>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        {currentHref === "/brand-kit" ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueBrand")}
          </p>
        ) : null}
        {currentHref === "/tools/board-notice" ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueBoard")}
          </p>
        ) : null}
        {currentHref === "/tools/graphic-maker" ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueGraphic")}
          </p>
        ) : null}
        {currentHref === "/captions" ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {quartetComplete ? t("continueCaptionsThenWebsite") : t("continueCaptions")}
          </p>
        ) : null}
        {currentHref === WORKSHOP_DEMO_WEBSITE_HREF ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueWebsite")}
          </p>
        ) : null}
      </div>
    );
  }

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
        {WORKSHOP_DEMO_STEPS.map((step, i) => (
          <li
            key={step.href}
            className="inline-flex items-center gap-1 sm:gap-2"
          >
            {i > 0 ? (
              <span className="hidden text-gray-400 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
            <WorkshopDemoJoinLink
              href={step.href}
              className="inline-flex min-h-11 items-center rounded-lg border border-opseu-blue/20 bg-opseu-blue/5 px-3 text-sm font-semibold text-opseu-blue underline-offset-2 hover:underline"
            >
              <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white">
                {i + 1}
              </span>
              {t(step.labelKey)}
            </WorkshopDemoJoinLink>
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
