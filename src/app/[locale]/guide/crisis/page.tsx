import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { guideCtaOutlineClass } from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
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
  return buildPublicPageMetadata("/guide/crisis", params);
}

const TOC = [
  ["gate", "gate"],
  ["roles", "roles"],
  ["strike", "strike"],
  ["bargaining", "bargaining"],
  ["layoffs", "layoffs"],
  ["management", "management"],
  ["rhythm", "rhythm"],
  ["fullScenario", "fullScenario"],
  ["escalation", "escalation"],
  ["tools", "tools"],
] as const;

const gateKeys = ["strike", "bargaining", "layoff", "normal"] as const;
const roleKeys = ["president", "comms", "spokesperson", "servicing"] as const;
const strikeKeys = [
  "approve",
  "schedule",
  "safety",
  "consent",
  "sector",
  "questions",
] as const;
const bargainingKeys = [
  "facts",
  "hashtag",
  "meetings",
  "approved",
  "comments",
  "link",
] as const;
const layoffKeys = [
  "empathy",
  "route",
  "facts",
  "leaders",
  "record",
  "names",
] as const;
const managementKeys = [
  "facts",
  "correction",
  "harassment",
  "screenshot",
  "stewards",
] as const;
const rhythmKeys = ["morning", "midday", "evening", "queue"] as const;
const scenarioKeys = ["t715", "t730", "t800", "t1000", "t1400", "t1700"] as const;
const escalationKeys = [
  "media",
  "legal",
  "safety",
  "leak",
  "viral",
] as const;
const toolKeys = [
  "brand",
  "board",
  "flyer",
  "graphic",
  "web",
  "captions",
] as const;

export default async function CrisisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crisisGuide");
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
            { href: "/tools/board-notice", label: nav("boardNotice") },
            {
              href: "/tools/flyer-maker",
              label: nav("flyerMaker"),
              variant: "outline",
            },
            {
              href: "/tools/graphic-maker",
              label: nav("graphicMaker"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/strike", label: nav("strikeOpsGuide") },
        { href: "/guide/bargaining", label: nav("bargainingGuide") },
        { href: "/guide/photo-consent", label: nav("photoConsent") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
      ]}
      footer={
        <SourcesBlock pageId="crisis" title={ts("title")} intro={ts("intro")} />
      }
    >
      <GuideCallout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </GuideCallout>

      <OfficerLearningModuleCallout
        slug="mobilizer-bargaining-partner"
        moduleNumber={7}
      />

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

      <GuideSection id="roles" title={t("roles.title")} intro={t("roles.intro")}>
        <GuideTipGrid className="mt-4">
          {roleKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`roles.items.${key}.label`)}
              content={t(`roles.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("roles.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="strike" title={t("strike.title")} intro={t("strike.intro")}>
        <GuideTipGrid className="mt-4">
          {strikeKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`strike.items.${key}.label`)}
              content={t(`strike.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link href="/guide/strike" className={guideCtaOutlineClass}>
            {nav("strikeOpsGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="bargaining"
        title={t("bargaining.title")}
        intro={t("bargaining.intro")}
      >
        <GuideTipGrid className="mt-4">
          {bargainingKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`bargaining.items.${key}.label`)}
              content={t(`bargaining.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link href="/guide/bargaining" className={guideCtaOutlineClass}>
            {nav("bargainingGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection id="layoffs" title={t("layoffs.title")} intro={t("layoffs.intro")}>
        <GuideTipGrid className="mt-4">
          {layoffKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`layoffs.items.${key}.label`)}
              content={t(`layoffs.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="management"
        title={t("management.title")}
        intro={t("management.intro")}
      >
        <GuideTipGrid className="mt-4">
          {managementKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`management.items.${key}.label`)}
              content={t(`management.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">
            {t("management.warningTitle")}
          </p>
          <p className="mt-1">{t("management.warning")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="rhythm" title={t("rhythm.title")} intro={t("rhythm.intro")}>
        <GuideTipGrid className="mt-4">
          {rhythmKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`rhythm.items.${key}.label`)}
              content={t(`rhythm.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("rhythm.tip")}</p>
        </GuideCallout>
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
        <GuideCallout tone="muted" className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullScenario.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="escalation"
        title={t("escalation.title")}
        intro={t("escalation.intro")}
      >
        <GuideTipGrid className="mt-4">
          {escalationKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`escalation.items.${key}.label`)}
              content={t(`escalation.items.${key}.content`)}
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
          <Link href="/brand-kit" className={guideCtaOutlineClass}>
            {nav("brandKit")}
          </Link>
          <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
            {nav("boardNotice")}
          </Link>
          <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
            {nav("flyerMaker")}
          </Link>
          <Link href="/tools/graphic-maker" className={guideCtaOutlineClass}>
            {nav("graphicMaker")}
          </Link>
        </GuideActionRow>
      </GuideSection>
    </GuideLayout>
  );
}



