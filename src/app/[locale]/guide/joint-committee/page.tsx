import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import {
  GuideLayout,
  GuideActionRow,
  GuideCallout,
  GuideOutlineList,
  GuideOutlineStep,
  GuideProse,
  GuideSection,
  GuideTipGrid,
  GuideTipItem,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/joint-committee", params);
}

const TOC = [
  ["gate", "gate"],
  ["localFirst", "localFirst"],
  ["referUp", "referUp"],
  ["caucus", "caucus"],
  ["jointTable", "jointTable"],
  ["afterMinutes", "afterMinutes"],
  ["fullScenario", "fullScenario"],
  ["caArticles", "caArticles"],
  ["notThis", "notThis"],
  ["tools", "tools"],
] as const;

const gateKeys = ["grievance", "local", "system", "hs"] as const;
const localFirstKeys = ["schedule", "record", "deadline", "refer"] as const;
const referUpKeys = ["facts", "localLog", "ask", "notify"] as const;
const caucusKeys = ["ask", "roles", "brief", "private"] as const;
const jointTableKeys = [
  "refuse",
  "speak",
  "minutes",
  "consensus",
  "noBargain",
] as const;
const afterMinutesKeys = ["link", "note", "locals", "comms"] as const;
const fullScenarioKeys = ["w1", "w3", "w5", "w7"] as const;
const caArticleKeys = ["pt", "ft", "other"] as const;
const notThisKeys = ["grievance", "jhsc", "lec", "bargain"] as const;
const toolKeys = ["letterhead", "explainer", "email", "portal"] as const;

export default async function JointCommitteeGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jointCommitteeGuide");
  const guide = await getTranslations("guide");
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
              href: documentGeneratorPresetHref("letterhead"),
              label: nav("documentGenerator"),
            },
            {
              href: "/tools/flyer-maker",
              label: nav("flyerMaker"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
        { href: "/guide/dfr", label: guide("labourGuides.dfr") },
        { href: "/guide/bargaining", label: nav("bargainingGuide") },
        { href: "/guide/email-broadcast", label: t("related.email") },
      ]}
      footer={
        <SourcesBlock
          pageId="jointCommittee"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <GuideCallout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </GuideCallout>

      <OfficerLearningModuleCallout slug="joint-workplace-committees" moduleNumber={10} />

      <GuideSection id="gate" title={t("gate.title")} intro={t("gate.intro")}>
        <GuideTipGrid className="mt-4">
          {gateKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`gate.items.${key}.label`)}
              content={t(`gate.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="localFirst"
        title={t("localFirst.title")}
        intro={t("localFirst.intro")}
      >
        <GuideTipGrid className="mt-4">
          {localFirstKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`localFirst.items.${key}.label`)}
              content={t(`localFirst.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("localFirst.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="referUp"
        title={t("referUp.title")}
        intro={t("referUp.intro")}
      >
        <GuideTipGrid className="mt-4">
          {referUpKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`referUp.items.${key}.label`)}
              content={t(`referUp.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection id="caucus" title={t("caucus.title")} intro={t("caucus.intro")}>
        <h3 className="mt-6 text-lg font-bold text-opseu-dark">
          {t("caucus.practicesTitle")}
        </h3>
        <GuideTipGrid className="mt-3">
          {caucusKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`caucus.items.${key}.label`)}
              content={t(`caucus.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("caucus.tip")}</p>
        </GuideCallout>
        <GuideActionRow>
          <Link
            href={documentGeneratorPresetHref("letterhead")}
            className={guideCtaClass}
          >
            {t("related.letterhead")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="jointTable"
        title={t("jointTable.title")}
        intro={t("jointTable.intro")}
      >
        <GuideTipGrid className="mt-4">
          {jointTableKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`jointTable.items.${key}.label`)}
              content={t(`jointTable.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">
            {t("jointTable.warningTitle")}
          </p>
          <p className="mt-1">{t("jointTable.warning")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="afterMinutes"
        title={t("afterMinutes.title")}
        intro={t("afterMinutes.intro")}
      >
        <GuideTipGrid className="mt-4">
          {afterMinutesKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`afterMinutes.items.${key}.label`)}
              content={t(`afterMinutes.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("afterMinutes.tip")}</p>
        </GuideCallout>
        <GuideActionRow>
          <Link
            href={documentGeneratorPresetHref("letterhead")}
            className={guideCtaOutlineClass}
          >
            {t("afterMinutes.letterCta")}
          </Link>
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {t("afterMinutes.emailCta")}
          </Link>
          <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
            {t("afterMinutes.flyerCta")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="fullScenario"
        title={t("fullScenario.title")}
        intro={t("fullScenario.intro")}
      >
        <GuideOutlineList className="mt-4 space-y-6">
          {fullScenarioKeys.map((key, index) => (
            <GuideOutlineStep
              key={key}
              id={`fullScenario-${key}`}
              step={index + 1}
              title={t(`fullScenario.phases.${key}.label`)}
            >
              <GuideProse className="mt-2">
                {t(`fullScenario.phases.${key}.content`)}
              </GuideProse>
            </GuideOutlineStep>
          ))}
        </GuideOutlineList>
        <GuideCallout tone="muted" className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullScenario.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="caArticles"
        title={t("caArticles.title")}
        intro={t("caArticles.intro")}
      >
        <GuideTipGrid className="mt-4">
          {caArticleKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`caArticles.items.${key}.label`)}
              content={t(`caArticles.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection id="notThis" title={t("notThis.title")} intro={t("notThis.intro")}>
        <GuideTipGrid className="mt-4">
          {notThisKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`notThis.items.${key}.label`)}
              content={t(`notThis.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="tools"
        title={t("tools.title")}
        intro={t("tools.intro")}
      >
        <GuideTipGrid className="mt-4">
          {toolKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`tools.items.${key}.label`)}
              content={t(`tools.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link
            href={documentGeneratorPresetHref("letterhead")}
            className={guideCtaOutlineClass}
          >
            {nav("documentGenerator")}
          </Link>
          <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
            {nav("flyerMaker")}
          </Link>
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {nav("emailBroadcastGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideCallout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("example.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("example.body")}</p>
      </GuideCallout>

      <GuideCallout className="mt-8">
        <p className="font-semibold text-opseu-dark">{t("portal.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("portal.body")}</p>
      </GuideCallout>
    </GuideLayout>
  );
}


