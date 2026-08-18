"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { WorkshopDemoJoinLink } from "@/components/comms/WorkshopDemoJoinLink";
import { useWorkshopDemoStepVisit } from "@/hooks/use-workshop-demo-session";
import {
  canonicalWorkshopDemoHref,
  WORKSHOP_DEMO_EXAMPLES_HREF,
  WORKSHOP_DEMO_GRAPHIC_HREF,
  WORKSHOP_DEMO_LOGO_HREF,
  WORKSHOP_DEMO_QUOTE_HREF,
  WORKSHOP_DEMO_WEBSITE_HREF,
} from "@/lib/comms/workshop-demo-session";

export const WORKSHOP_DEMO_STEPS = [
  { href: WORKSHOP_DEMO_LOGO_HREF, labelKey: "stepLogo" as const },
  { href: WORKSHOP_DEMO_EXAMPLES_HREF, labelKey: "stepExamples" as const },
  { href: WORKSHOP_DEMO_GRAPHIC_HREF, labelKey: "stepGraphic" as const },
  { href: WORKSHOP_DEMO_QUOTE_HREF, labelKey: "stepQuote" as const },
  { href: WORKSHOP_DEMO_WEBSITE_HREF, labelKey: "stepWebsite" as const },
] as const;

type WorkshopDemoPathProps = {
  className?: string;
  showRoadmapLink?: boolean;
  /**
   * `card` is the First week / home pitch.
   * `trail` is the quiet continuation on the demo tools.
   */
  variant?: "card" | "trail";
};

function isIdentitySetupPath(pathname: string): boolean {
  return (
    pathname === "/brand-kit" ||
    pathname.startsWith("/brand-kit/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  );
}

/**
 * Compact “demo in ~20 minutes” path for home + First week, plus a quiet
 * in-tool trail. Matches From Scratch to Solidarity: logo, examples, graphic, quote, website.
 */
export function WorkshopDemoPath({
  className,
  showRoadmapLink = true,
  variant = "card",
}: WorkshopDemoPathProps) {
  const t = useTranslations("workshopDemo");
  const pathname = usePathname();
  useWorkshopDemoStepVisit(variant === "trail");

  if (variant === "trail") {
    const currentHref = canonicalWorkshopDemoHref(pathname);

    return (
      <div className={className}>
        <nav aria-label={t("trailNavLabel")}>
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {WORKSHOP_DEMO_STEPS.map((step, i) => {
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
        {currentHref === WORKSHOP_DEMO_LOGO_HREF && isIdentitySetupPath(pathname) ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueBrand")}
          </p>
        ) : null}
        {currentHref === WORKSHOP_DEMO_LOGO_HREF && !isIdentitySetupPath(pathname) ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueLogo")}
          </p>
        ) : null}
        {currentHref === WORKSHOP_DEMO_EXAMPLES_HREF ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueExamples")}
          </p>
        ) : null}
        {currentHref === WORKSHOP_DEMO_GRAPHIC_HREF ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueGraphic")}
          </p>
        ) : null}
        {currentHref === WORKSHOP_DEMO_QUOTE_HREF ? (
          <p className="mt-1 max-w-prose text-sm text-gray-600">
            {t("continueQuote")}
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
