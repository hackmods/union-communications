import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { guideCtaClass } from "@/components/comms/guideCtaClasses";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import {
  GuideLayout,
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
  return buildPublicPageMetadata("/guide/dfr", params);
}

const TOC = [
  ["gate", "gate"],
  ["scope", "scope"],
  ["legalTest", "legalTest"],
  ["intake", "intake"],
  ["investigate", "investigate"],
  ["clocks", "clocks"],
  ["decline", "decline"],
  ["fullScenario", "fullScenario"],
  ["failureModes", "failureModes"],
  ["memberTalk", "memberTalk"],
] as const;

const gateKeys = ["steward", "member", "officer", "conflict"] as const;
const scopeKeys = ["ontario", "college", "federal"] as const;
const legalTestKeys = [
  "arbitrary",
  "discriminatory",
  "badFaith",
  "honest",
] as const;
const intakeKeys = ["log", "calendar", "member", "conflict"] as const;
const investigateKeys = [
  "interview",
  "documents",
  "witnesses",
  "notes",
] as const;
const clocksKeys = ["trigger", "count", "extension", "late"] as const;
const declineKeys = ["written", "review", "escalate", "silence"] as const;
const fullScenarioKeys = ["d0", "d2", "d4", "d6"] as const;
const failureModeKeys = [
  "missedClock",
  "noFile",
  "noLetter",
  "overPromise",
  "personalBias",
] as const;
const memberTalkKeys = ["promise", "status", "confidential", "respect"] as const;

export default async function DfrGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dfrGuide");
  const tg = await getTranslations("guideCommon");
  const tgriev = await getTranslations("grievanceGuide");
  const nav = await getTranslations("nav");
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
              href: documentGeneratorPresetHref("grievance-intake"),
              label: tgriev("worksheet.exportCta"),
            },
            {
              href: "/guide/grievance-process",
              label: nav("grievanceProcessGuide"),
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
        { href: "/guide/seniority-bumping", label: t("related.seniority") },
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
        { href: "/guide/joint-committee", label: t("related.jointCommittee") },
      ]}
      footer={
        <SourcesBlock pageId="dfr" title={ts("title")} intro={ts("intro")} />
      }
    >
      <GuideCallout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </GuideCallout>

      <OfficerLearningModuleCallout slug="duty-of-fair-representation" moduleNumber={15} />

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
        id="scope"
        title={t("scope.title")}
        intro={t("scope.intro")}
      >
        <GuideTipGrid className="mt-4">
          {scopeKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`scope.items.${key}.label`)}
              content={t(`scope.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="legalTest"
        title={t("legalTest.title")}
        intro={t("legalTest.intro")}
      >
        <GuideTipGrid className="mt-4">
          {legalTestKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`legalTest.items.${key}.label`)}
              content={t(`legalTest.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="intake"
        title={t("intake.title")}
        intro={t("intake.intro")}
      >
        <GuideTipGrid className="mt-4">
          {intakeKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`intake.items.${key}.label`)}
              content={t(`intake.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("intake.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="investigate"
        title={t("investigate.title")}
        intro={t("investigate.intro")}
      >
        <GuideTipGrid className="mt-4">
          {investigateKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`investigate.items.${key}.label`)}
              content={t(`investigate.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="clocks"
        title={t("clocks.title")}
        intro={t("clocks.intro")}
      >
        <GuideTipGrid className="mt-4">
          {clocksKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`clocks.items.${key}.label`)}
              content={t(`clocks.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">
            {t("clocks.warningTitle")}
          </p>
          <p className="mt-1">{t("clocks.warning")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="decline"
        title={t("decline.title")}
        intro={t("decline.intro")}
      >
        <GuideTipGrid className="mt-4">
          {declineKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`decline.items.${key}.label`)}
              content={t(`decline.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("decline.tip")}</p>
        </GuideCallout>
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
        id="failureModes"
        title={t("failureModes.title")}
        intro={t("failureModes.intro")}
      >
        <GuideTipGrid className="mt-4">
          {failureModeKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`failureModes.items.${key}.label`)}
              content={t(`failureModes.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="memberTalk"
        title={t("memberTalk.title")}
        intro={t("memberTalk.intro")}
      >
        <GuideTipGrid className="mt-4">
          {memberTalkKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`memberTalk.items.${key}.label`)}
              content={t(`memberTalk.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideCallout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
        <div className="button-row mt-4">
          <Link href="/app/grievances" className={guideCtaClass}>
            {t("hub.cta")}
          </Link>
        </div>
      </GuideCallout>
    </GuideLayout>
  );
}


