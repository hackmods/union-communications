import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { TrainingPathDiagram } from "@/components/comms/StewardGuideDiagrams";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { Callout } from "@/components/ui/Callout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/steward-playbooks", params);
}

const TOC = [
  ["trainingPath", "trainingPath"],
  ["workspaces", "workspaces"],
  ["quiz", "quiz"],
  ["playbooks", "playbooks"],
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
] as const;

const playbookLinks = [
  { href: "/guide/steward-101", key: "steward101" as const },
  { href: "/guide/officer-learning", key: "officerLearning" as const, featured: true },
  { href: "/guide/grievance-process", key: "grievance" as const },
  { href: "/guide/dfr", key: "dfr" as const },
  { href: "/guide/workplace-mapping", key: "workplaceMapping" as const },
  { href: "/guide/membership-signup", key: "membershipSignup" as const },
  { href: "/guide/right-to-refuse", key: "rightToRefuse" as const },
  { href: "/guide/seniority-bumping", key: "seniority" as const },
  { href: "/guide/joint-committee", key: "jointCommittee" as const },
  { href: "/guide/bargaining", key: "bargaining" as const },
  { href: "/guide/bylaws", key: "bylaws" as const },
] as const;

export default async function StewardPlaybooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stewardPlaybooksHub");
  const ts = await getTranslations("sources");
  const pathSteps = t.raw("pathSteps") as Parameters<typeof TrainingPathDiagram>[0]["steps"];

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
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
      <nav className="mb-8 flex flex-wrap gap-2" aria-label={t("tocLabel")}>
        {TOC.map(([id, key]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            {t(`sections.${key}`)}
          </a>
        ))}
      </nav>

      <section id="trainingPath" className="scroll-mt-28">
        <Callout className="mb-8 max-w-3xl">
          <p className="font-semibold text-opseu-dark">{t("trainingPath.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{t("trainingPath.body")}</p>
          <TrainingPathDiagram steps={pathSteps} className="mt-4" />
          <div className="button-row mt-4">
            <Link href="/guide/steward-101" className={guideCtaClass}>
              {t("trainingPath.steward101Cta")}
            </Link>
            <Link href="/guide/officer-learning" className={guideCtaOutlineClass}>
              {t("trainingPath.officerLearningCta")}
            </Link>
          </div>
        </Callout>
      </section>

      <section id="workspaces" className="scroll-mt-28">
        <Callout tone="muted" className="mb-8 max-w-3xl">
          <p className="font-semibold text-opseu-dark">{t("workspaces.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{t("workspaces.body")}</p>
          <ul className="mt-4 space-y-3">
            {workspaceLinks.map(({ href, titleKey, blurbKey }) => (
              <li
                key={href}
                className="rounded-lg border border-gray-200 border-l-2 border-l-opseu-blue/40 bg-white p-4"
              >
                <Link
                  href={href}
                  className="font-semibold text-opseu-blue underline underline-offset-2"
                >
                  {t(`workspaces.${titleKey}`)}
                </Link>
                <p className="mt-1 text-sm text-gray-600">{t(`workspaces.${blurbKey}`)}</p>
              </li>
            ))}
          </ul>
          <div className="button-row mt-4">
            <Link href="/app/steward-guides" className={guideCtaOutlineClass}>
              {t("workspaces.hubCta")}
            </Link>
          </div>
        </Callout>
      </section>

      <section id="quiz" className="scroll-mt-28">
        <Callout tone="muted" className="mb-8 max-w-3xl">
          <p className="font-semibold text-opseu-dark">{t("quizCallout.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{t("quizCallout.body")}</p>
        </Callout>
      </section>

      <section
        id="playbooks"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark">{t("playbooks.title")}</h2>
        <p className="mt-2 max-w-prose text-gray-700">{t("playbooks.intro")}</p>
        <ul className="mt-4 space-y-4">
          {playbookLinks.map(({ href, key, ...rest }) => (
            <li
              key={href}
              className={
                "featured" in rest && rest.featured
                  ? "rounded-xl border border-teal-200 bg-teal-50/60 p-4"
                  : undefined
              }
            >
              <Link href={href} className="font-medium text-opseu-blue underline">
                {t(`links.${key}`)}
              </Link>
              {"featured" in rest && rest.featured ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
                  {t("quizBadge")}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-gray-600">{t(`blurbs.${key}`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </GuideLayout>
  );
}
