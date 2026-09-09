import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  GuideLayout,
  GuideSection,
  GuideBulletList,
  GuideOutlineList,
  GuideOutlineStep,
  GuideWorkshopNote,
  GuideActionRow,
} from "@/components/comms/guide-ui";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import {
  guideCtaClassSm,
  guideCtaGhostClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/workshop", params);
}

const PREREQ_KEYS = ["device", "logo", "colours", "number", "prompt"] as const;
const OUTLINE_KEYS = ["strategy", "identity", "inspiration", "media", "close"] as const;
const OUTLINE_TOC = [
  ["outline-strategy", "strategy"],
  ["outline-identity", "identity"],
  ["outline-inspiration", "inspiration"],
  ["outline-media", "media"],
  ["outline-close", "close"],
] as const;
const WRAP_KEYS = ["bookmark", "logo", "post", "website", "checklist"] as const;

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
};

export default async function WorkshopGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workshopGuide");
  const tg = await getTranslations("guideCommon");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(OUTLINE_TOC, (key) =>
    t(`outlineItems.${key}.navLabel`),
  );

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("outlineNavLabel")}
      aside={
        <GuideToolAside
          title={tg("asideTitle")}
          intro={tg("asideIntro")}
          links={[
            { href: "/brand-kit", label: nav("brandKit") },
            {
              href: "/tools/logo-builder",
              label: nav("logoBuilder"),
              variant: "outline",
            },
            {
              href: "/guide/social-media-plan",
              label: nav("socialMediaPlan"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/workshops", label: nav("workshopsHub") },
        {
          href: "/guide/workshops/land-acknowledgement",
          label: nav("landAckWorkshopGuide"),
        },
        { href: "/guide/resources", label: t("resourcesCta") },
        { href: "/guide/social-media-plan", label: t("roadmapCta") },
        { href: "/tools", label: t("toolsCta") },
      ]}
      footer={
        <SourcesBlock pageId="workshop" title={ts("title")} intro={ts("intro")} />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <GuideWorkshopNote tone="facilitator" label={t("audienceFacilitatorLabel")}>
          {t("audienceFacilitator")}
        </GuideWorkshopNote>
        <GuideWorkshopNote tone="attendee" label={t("audienceAttendeeLabel")}>
          {t("audienceAttendee")}
        </GuideWorkshopNote>
      </div>

      <GuideSection id="prereq" title={t("prereqTitle")} intro={t("prereqIntro")}>
        <GuideBulletList className="mt-0 space-y-2">
          {PREREQ_KEYS.map((key) => (
            <li key={key} className="leading-relaxed">
              {t.rich(`prereq.${key}`, richMarks)}
            </li>
          ))}
        </GuideBulletList>
      </GuideSection>

      <section
        className="mt-10 scroll-mt-28 rounded-2xl border-2 border-opseu-blue/40 bg-opseu-blue/5 p-5 sm:p-6"
        aria-label={t("demoKicker")}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-opseu-blue">
          {t("demoKicker")}
        </p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-gray-700">
          {t("demoLead")}
        </p>
        <div className="mt-4 rounded-xl border border-opseu-blue/20 bg-white p-4 sm:p-5">
          <WorkshopDemoPath showRoadmapLink />
        </div>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-gray-700">
          {t("demoNote")}
        </p>
      </section>

      <GuideSection
        id="outline"
        title={t("outlineTitle")}
        intro={t.rich("outlineIntro", richMarks)}
      >
        <GuideOutlineList>
          {OUTLINE_KEYS.map((key, index) => (
            <GuideOutlineStep
              key={key}
              id={`outline-${key}`}
              step={index + 1}
              title={t(`outlineItems.${key}.title`)}
              badge={t(`outlineItems.${key}.time`)}
            >
              <GuideWorkshopNote
                className="mt-3"
                tone="attendee"
                label={t("audienceAttendeeLabel")}
              >
                {t.rich(`outlineItems.${key}.do`, richMarks)}
              </GuideWorkshopNote>
              <GuideWorkshopNote
                className="mt-3"
                tone="facilitator"
                label={t("audienceFacilitatorLabel")}
              >
                {t.rich(`outlineItems.${key}.facilitator`, richMarks)}
              </GuideWorkshopNote>
            </GuideOutlineStep>
          ))}
        </GuideOutlineList>
      </GuideSection>

      <GuideSection id="wrap" title={t("wrapTitle")} intro={t("wrapIntro")}>
        <ol className="list-decimal space-y-3 pl-5 text-gray-700">
          {WRAP_KEYS.map((key) => (
            <li key={key} className="leading-relaxed">
              {t.rich(`wrap.${key}`, richMarks)}
            </li>
          ))}
        </ol>
        <GuideWorkshopNote
          className="mt-4"
          tone="facilitator"
          label={t("audienceFacilitatorLabel")}
        >
          {t("wrapFacilitator")}
        </GuideWorkshopNote>
      </GuideSection>

      <GuideActionRow className="mt-10">
        <Link href="/guide/resources" className={guideCtaClassSm}>
          {t("resourcesCta")}
        </Link>
        <Link href="/guide/social-media-plan" className={guideCtaOutlineClassSm}>
          {t("roadmapCta")}
        </Link>
        <Link href="/tools" className={guideCtaGhostClassSm}>
          {t("toolsCta")}
        </Link>
      </GuideActionRow>
    </GuideLayout>
  );
}
