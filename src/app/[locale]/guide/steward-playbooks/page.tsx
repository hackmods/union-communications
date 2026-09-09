import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { TrainingPathDiagram } from "@/components/comms/StewardGuideDiagrams";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GUIDE_STEWARD_PLAYBOOK_GROUPS } from "@/lib/comms/guide-registry";
import {
  GuideLayout,
  GuideActionRow,
  GuideCallout,
  GuideCatalogCard,
  GuideSection,
  GuideWideFigure,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/steward-playbooks", params);
}

const TOC = [
  ["playbooks", "playbooks"],
  ["trainingPath", "trainingPath"],
  ["workspaces", "workspaces"],
  ["quiz", "quiz"],
] as const;

const workspaceLinks = [
  {
    href: "/tools/complaint-vs-grievance",
    titleKey: "diagnosticTitle" as const,
    blurbKey: "diagnosticBlurb" as const,
  },
  {
    href: "/tools/pre-disciplinary-log",
    titleKey: "disciplineTitle" as const,
    blurbKey: "disciplineBlurb" as const,
  },
  {
    href: "/tools/rtw-accommodation",
    titleKey: "rtwTitle" as const,
    blurbKey: "rtwBlurb" as const,
  },
  {
    href: "/tools/bylaw-builder",
    titleKey: "bylawsTitle" as const,
    blurbKey: "bylawsBlurb" as const,
  },
  {
    href: "/tools/proposal-tracker",
    titleKey: "proposalTitle" as const,
    blurbKey: "proposalBlurb" as const,
  },
  {
    href: "/tools/rules-of-order",
    titleKey: "rulesTitle" as const,
    blurbKey: "rulesBlurb" as const,
  },
] as const;

const playbookGroups = [
  "training",
  "floor",
  "local",
  "campaign",
] as const;

export default async function StewardPlaybooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stewardPlaybooksHub");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");
  const pathSteps = t.raw("pathSteps") as Parameters<
    typeof TrainingPathDiagram
  >[0]["steps"];

  const tocItems = TOC.map(([id, key]) => ({
    id,
    label: t(`sections.${key}`),
  }));

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("tocLabel")}
      aside={
        <GuideToolAside
          title={tg("asideTitle")}
          intro={tg("asideIntro")}
          links={[
            {
              href: "/tools/complaint-vs-grievance",
              label: t("workspaces.diagnosticTitle"),
            },
            {
              href: "/guide/steward-101",
              label: t("trainingPath.steward101Cta"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("links.officerLearning") },
        { href: "/guide/steward-101", label: t("links.steward101") },
      ]}
      footer={
        <SourcesBlock
          pageId="stewardPlaybooksHub"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <GuideSection
        id="playbooks"
        title={t("playbooks.title")}
        intro={t("playbooks.intro")}
      >
        {playbookGroups.map((groupId) => (
          <div key={groupId} className="not-first:mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t(`groups.${groupId}`)}
            </h3>
            <ul className="mt-4 grid list-none gap-5 p-0 sm:grid-cols-2">
              {GUIDE_STEWARD_PLAYBOOK_GROUPS[groupId].map(
                ({ href, key, ...rest }) => {
                  const featured = "featured" in rest && rest.featured;
                  return (
                    <GuideCatalogCard
                      key={href}
                      className={
                        featured
                          ? "rounded-r-lg border border-opseu-blue/25 border-l-opseu-blue bg-opseu-blue/[0.06] py-3 pr-4"
                          : undefined
                      }
                      title={t(`links.${key}`)}
                      body={t(`blurbs.${key}`)}
                      meta={featured ? t("quizBadge") : undefined}
                      action={
                        <Link href={href} className={guideCtaOutlineClass}>
                          {t(`links.${key}`)} →
                        </Link>
                      }
                    />
                  );
                },
              )}
            </ul>
          </div>
        ))}
      </GuideSection>

      <GuideSection
        id="trainingPath"
        title={t("trainingPath.title")}
        intro={t("trainingPath.body")}
      >
        <GuideWideFigure>
          <TrainingPathDiagram steps={pathSteps} className="w-full" />
        </GuideWideFigure>
        <GuideActionRow>
          <Link href="/guide/steward-101" className={guideCtaClass}>
            {t("trainingPath.steward101Cta")}
          </Link>
          <Link href="/guide/officer-learning" className={guideCtaOutlineClass}>
            {t("trainingPath.officerLearningCta")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="workspaces"
        title={t("workspaces.title")}
        intro={t("workspaces.body")}
      >
        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2">
          {workspaceLinks.map(({ href, titleKey, blurbKey }) => (
            <GuideCatalogCard
              key={href}
              title={t(`workspaces.${titleKey}`)}
              body={t(`workspaces.${blurbKey}`)}
              action={
                <Link href={href} className={guideCtaOutlineClass}>
                  {t(`workspaces.${titleKey}`)} →
                </Link>
              }
            />
          ))}
        </ul>
        <GuideActionRow>
          <Link href="/app/steward-guides" className={guideCtaOutlineClass}>
            {t("workspaces.hubCta")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection id="quiz" title={t("quizCallout.title")}>
        <GuideCallout tone="muted" measure="fill" className="mt-0">
          <p className="leading-relaxed text-gray-700">{t("quizCallout.body")}</p>
        </GuideCallout>
      </GuideSection>
    </GuideLayout>
  );
}
