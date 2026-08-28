import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { Callout } from "@/components/ui/Callout";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/running-meetings", params);
}

const TOC = [
  ["formality", "formality"],
  ["chair", "chair"],
  ["agenda", "agenda"],
  ["motion", "motion"],
  ["tool", "tool"],
] as const;

const formalityKeys = ["executive", "gmm", "convention"] as const;
const chairKeys = ["referee", "neutral", "stepDown"] as const;
const agendaKeys = [
  "callToOrder",
  "adoptAgenda",
  "minutes",
  "treasurer",
  "reports",
  "unfinished",
  "newBusiness",
  "adjournment",
] as const;
const motionKeys = ["move", "second", "debate", "vote", "result"] as const;

export default async function RunningMeetingsGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("runningMeetingsGuide");
  const nav = await getTranslations("nav");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");

  const tocItems = TOC.map(([id, key]) => ({
    id,
    label: t(`${key}.navLabel`),
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
              href: "/tools/rules-of-order",
              label: nav("rulesOfOrder"),
            },
            {
              href: "/tools/board-notice",
              label: nav("boardNotice"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/bylaws", label: nav("bylawsGuide") },
        { href: "/guide/bargaining", label: nav("bargainingGuide") },
      ]}
      footer={
        <SourcesBlock
          pageId="runningMeetings"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </Callout>

      <OfficerLearningModuleCallout slug="democratic-governance" moduleNumber={4} />

      <GuideSection
        id="formality"
        title={t("formality.title")}
        intro={t("formality.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {formalityKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`formality.items.${key}.label`)}
              content={t(`formality.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="chair" title={t("chair.title")} intro={t("chair.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {chairKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`chair.items.${key}.label`)}
              content={t(`chair.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("chair.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="agenda"
        title={t("agenda.title")}
        intro={t("agenda.intro")}
      >
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-gray-700">
          {agendaKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t(`agenda.items.${key}`)}
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection
        id="motion"
        title={t("motion.title")}
        intro={t("motion.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {motionKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`motion.steps.${key}.label`)}
              </span>
              {" — "}
              {t(`motion.steps.${key}.content`)}
            </li>
          ))}
        </ol>
      </GuideSection>

      <section
        id="tool"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5 not-first:mt-12"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("tool.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("tool.intro")}
        </p>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/rules-of-order" className={guideCtaClass}>
            {nav("rulesOfOrder")}
          </Link>
          <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
            {nav("boardNotice")}
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

function GuideSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5 not-first:mt-12"
    >
      <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">{title}</h2>
      <p className="mt-3 max-w-prose leading-relaxed text-gray-700">{intro}</p>
      {children}
    </section>
  );
}

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
