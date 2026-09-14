import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
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
  return buildPublicPageMetadata("/guide/photo-consent", params);
}

const TOC = [
  ["gate", "gate"],
  ["why", "why"],
  ["tiers", "tiers"],
  ["askScript", "askScript"],
  ["recordKeeping", "recordKeeping"],
  ["checklist", "checklist"],
  ["takedown", "takedown"],
  ["privacy", "privacy"],
  ["fullScenario", "fullScenario"],
  ["workshop", "workshop"],
  ["tools", "tools"],
] as const;

const gateKeys = ["crowd", "spotlight", "workplace", "crisis"] as const;
const tierKeys = ["rally", "meeting", "workplace"] as const;
const askKeys = ["spotlight", "meeting", "group", "video"] as const;
const recordKeys = ["who", "where", "how", "storage"] as const;
const checklistKeys = [
  "consent",
  "public",
  "confidential",
  "group",
  "minors",
  "background",
  "location",
  "withdrawal",
] as const;
const takedownKeys = ["speed", "everywhere", "log", "thanks"] as const;
const privacyKeys = ["ipc", "pipeda", "ca", "crisis"] as const;
const scenarioKeys = ["ask", "shoot", "export", "post", "later"] as const;
const toolKeys = ["graphic", "shortForm", "crisis", "privacy"] as const;

export default async function PhotoConsentGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("photoConsentGuide");
  const nav = await getTranslations("nav");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(TOC, (key) => t(`${key}.navLabel`));

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
            { href: "/tools/graphic-maker", label: nav("graphicMaker") },
            {
              href: "/guide/short-form",
              label: nav("shortFormGuide"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/short-form", label: nav("shortFormGuide") },
        { href: "/guide/crisis", label: nav("crisisCommsGuide") },
      ]}
      footer={
        <SourcesBlock
          pageId="photoConsent"
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

      <OfficerLearningModuleCallout slug="human-rights-accommodation" moduleNumber={3} />

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

      <GuideSection id="why" title={t("why.title")} intro={t("why.intro")}>
        <GuideCallout tone="warning" className="mt-4">
          <p className="font-semibold text-amber-950">
            {t("why.retaliationTitle")}
          </p>
          <p className="mt-1">{t("why.retaliationBody")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="tiers" title={t("tiers.title")} intro={t("tiers.intro")}>
        <GuideTipGrid className="mt-4">
          {tierKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`tiers.items.${key}.label`)}
              content={t(`tiers.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("tiers.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="askScript"
        title={t("askScript.title")}
        intro={t("askScript.intro")}
      >
        <GuideTipGrid className="mt-4">
          {askKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`askScript.items.${key}.label`)}
              content={t(`askScript.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="recordKeeping"
        title={t("recordKeeping.title")}
        intro={t("recordKeeping.intro")}
      >
        <GuideTipGrid className="mt-4">
          {recordKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`recordKeeping.items.${key}.label`)}
              content={t(`recordKeeping.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="muted" className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("recordKeeping.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <GuideTipGrid className="mt-4">
          {checklistKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`checklist.items.${key}.label`)}
              content={t(`checklist.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection id="takedown" title={t("takedown.title")} intro="">
        <GuideCallout >
          <p className="font-semibold text-opseu-dark">{t("takedown.rule")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{t("takedown.who")}</p>
        </GuideCallout>
        <GuideTipGrid className="mt-4">
          {takedownKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`takedown.items.${key}.label`)}
              content={t(`takedown.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="privacy"
        title={t("privacy.title")}
        intro={t("privacy.intro")}
      >
        <GuideTipGrid className="mt-4">
          {privacyKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`privacy.items.${key}.label`)}
              content={t(`privacy.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="fullScenario"
        title={t("fullScenario.title")}
        intro={t("fullScenario.intro")}
      >
        <GuideOutlineList className="mt-4 space-y-6">
          {scenarioKeys.map((key, index) => (
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
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullScenario.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="workshop"
        title={t("workshop.title")}
        intro={t("workshop.intro")}
      >
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("workshop.content")}
        </p>
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
          <Link href="/tools/graphic-maker" className={guideCtaClass}>
            {nav("graphicMaker")}
          </Link>
          <Link href="/guide/short-form" className={guideCtaOutlineClass}>
            {nav("shortFormGuide")}
          </Link>
          <Link href="/privacy" className={guideCtaOutlineClass}>
            {nav("privacy")}
          </Link>
          <Link href="/guide/resources" className={guideCtaOutlineClass}>
            {nav("resources")}
          </Link>
        </GuideActionRow>
      </GuideSection>
    </GuideLayout>
  );
}



