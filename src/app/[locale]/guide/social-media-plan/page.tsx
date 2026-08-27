import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { WorkshopDemoJoinLink } from "@/components/comms/WorkshopDemoJoinLink";
import {
  guideCtaClassSm,
  guideCtaGhostClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";
import { isWorkshopDemoJoinHref } from "@/lib/comms/workshop-demo-session";
import {
  FIRST_WEEK_STEP_KEYS,
  FIRST_WEEK_STEP_LINKS,
} from "@/lib/comms/first-week-roadmap";

function RoadmapStepLink({
  href,
  children,
  join = false,
  className,
}: {
  href: string;
  children: ReactNode;
  join?: boolean;
  className?: string;
}) {
  if (join || isWorkshopDemoJoinHref(href)) {
    return (
      <WorkshopDemoJoinLink href={href} className={className}>
        {children}
      </WorkshopDemoJoinLink>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/social-media-plan", params);
}

export default async function SocialMediaPlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("socialMediaPlan");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide", label: t("pathLinks.blueprintShort") },
        { href: "/guide/resources", label: t("pathLinks.resourcesShort") },
      ]}
      footer={
        <SourcesBlock
          pageId="socialMediaPlan"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <WorkshopDemoPath
        className="mb-8 rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
        showRoadmapLink={false}
      />

      <nav
        className="mb-8 flex flex-wrap gap-2"
        aria-label={t("stepsNavLabel")}
      >
        {FIRST_WEEK_STEP_KEYS.map((key, index) => (
          <a
            key={key}
            href={`#step-${key}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md bg-opseu-blue text-xs font-bold text-white"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {t(`steps.${key}.navLabel`)}
          </a>
        ))}
      </nav>

      <ol className="space-y-8">
        {FIRST_WEEK_STEP_KEYS.map((key, index) => (
          <li
            key={key}
            id={`step-${key}`}
            className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
          >
            <div className="flex items-baseline gap-3">
              <span
                className="text-sm font-bold tabular-nums text-opseu-blue"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="text-xl font-bold text-opseu-dark">
                {t(`steps.${key}.title`)}
              </h2>
            </div>
            <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
              {t(`steps.${key}.description`)}
            </p>
            {t.has(`steps.${key}.demoNote`) ? (
              <p className="mt-2 max-w-prose text-sm text-gray-600">
                {t(`steps.${key}.demoNote`)}
              </p>
            ) : null}
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
              {(t.raw(`steps.${key}.checklist`) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="button-row mt-4 max-w-lg">
              <RoadmapStepLink
                href={FIRST_WEEK_STEP_LINKS[key].primary}
                join
                className={guideCtaClassSm}
              >
                {t(`steps.${key}.cta`)}
              </RoadmapStepLink>
              <RoadmapStepLink
                href={FIRST_WEEK_STEP_LINKS[key].secondary}
                className={guideCtaOutlineClassSm}
              >
                {t(`steps.${key}.secondaryCta`)}
              </RoadmapStepLink>
              {FIRST_WEEK_STEP_LINKS[key].tertiary?.map((link) => (
                <RoadmapStepLink
                  key={link.href}
                  href={link.href}
                  className={guideCtaGhostClassSm}
                >
                  {t(`steps.${key}.${link.labelKey}`)}
                </RoadmapStepLink>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <section
        className="mt-12 border-t border-gray-200 pt-8"
        aria-labelledby="first-week-calendar"
      >
        <h2
          id="first-week-calendar"
          className="text-xl font-bold text-opseu-dark"
        >
          {t("calendar.title")}
        </h2>
        <p className="mt-2 max-w-prose text-gray-700">{t("calendar.intro")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(
            t.raw("calendar.weeks") as {
              title: string;
              items: string[];
            }[]
          ).map((week) => (
            <article
              key={week.title}
              className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
            >
              <h3 className="font-semibold text-opseu-dark">{week.title}</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
                {week.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </GuideLayout>
  );
}
