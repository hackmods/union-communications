import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  GuideLayout,
  GuideOutlineList,
  GuideOutlineStep,
  GuideActionRow,
  GuideProse,
  GuideSection,
} from "@/components/comms/guide-ui";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
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

const TOC = [
  ["step-logo", "logo"],
  ["step-boards", "boards"],
  ["step-print", "print"],
  ["step-socials", "socials"],
  ["step-website", "website"],
] as const;

export default async function SocialMediaPlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("socialMediaPlan");
  const tg = await getTranslations("guideCommon");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(TOC, (key) => t(`steps.${key}.navLabel`));

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("stepsNavLabel")}
      aside={
        <GuideToolAside
          title={tg("asideTitle")}
          intro={tg("asideIntro")}
          links={[
            { href: "/brand-kit", label: nav("brandKit") },
            {
              href: FIRST_WEEK_STEP_LINKS.boards.primary,
              label: t("steps.boards.navLabel"),
              variant: "outline",
            },
            {
              href: FIRST_WEEK_STEP_LINKS.socials.primary,
              label: t("steps.socials.navLabel"),
              variant: "outline",
            },
          ]}
        />
      }
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

      <GuideOutlineList className="mt-0 space-y-8">
        {FIRST_WEEK_STEP_KEYS.map((key, index) => (
          <GuideOutlineStep
            key={key}
            id={`step-${key}`}
            step={index + 1}
            title={t(`steps.${key}.title`)}
            headingAs="h2"
            indexStyle="padded"
          >
            <GuideProse className="mt-3">{t(`steps.${key}.description`)}</GuideProse>
            {t.has(`steps.${key}.demoNote`) ? (
              <GuideProse className="mt-2 text-sm text-gray-600">
                {t(`steps.${key}.demoNote`)}
              </GuideProse>
            ) : null}
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600 sm:columns-2 sm:gap-x-6">
              {(t.raw(`steps.${key}.checklist`) as string[]).map((item) => (
                <li key={item} className="break-inside-avoid">
                  {item}
                </li>
              ))}
            </ul>
            <GuideActionRow className="mt-4">
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
            </GuideActionRow>
          </GuideOutlineStep>
        ))}
      </GuideOutlineList>

      <GuideSection
        id="first-week-calendar"
        title={t("calendar.title")}
        intro={t("calendar.intro")}
        className="mt-12 border-l-0 border-t border-gray-200 pl-0 pt-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
      </GuideSection>
    </GuideLayout>
  );
}
