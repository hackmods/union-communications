import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideActionRow, GuideSection, GuideTipGrid, GuideTipItem } from "@/components/comms/guide-ui";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { Callout } from "@/components/ui/Callout";
import { guideCtaClass } from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/right-to-refuse", params);
}

const TOC = [
  ["gate", "gate"],
  ["ontarioScope", "ontarioScope"],
  ["stageOne", "stageOne"],
  ["stageTwo", "stageTwo"],
  ["reassignment", "reassignment"],
  ["reprisal", "reprisal"],
  ["fullScenario", "fullScenario"],
  ["stewardChecklist", "stewardChecklist"],
  ["boards", "boards"],
] as const;

const gateKeys = ["ohsa", "jhsc", "grievance", "both"] as const;
const ontarioScopeKeys = ["coverage", "federal", "modified", "unionRole"] as const;
const stageOneKeys = [
  "report",
  "safePlace",
  "accompany",
  "investigate",
  "stewardNotes",
  "resolve",
] as const;
const stageTwoKeys = [
  "trigger",
  "whoCalls",
  "inspector",
  "stewardRecords",
  "factsOnly",
] as const;
const reassignmentKeys = ["inform", "pay", "noSilent", "board"] as const;
const reprisalKeys = ["document", "sameDay", "sources", "notRoutine"] as const;
const fullScenarioKeys = ["t0", "t1", "t2", "t3", "t4"] as const;
const stewardChecklistKeys = [
  "beforeKnow",
  "beforeContacts",
  "duringPresent",
  "duringNotes",
  "afterFile",
  "afterBoard",
] as const;

export default async function RightToRefuseGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rightToRefuseGuide");
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
            {
              href: "/tools/qr-card?preset=rightToRefuse",
              label: t("boards.exportCta"),
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/guide/joint-committee", label: t("related.jointCommittee") },
        { href: "/guide/seniority-bumping", label: t("related.seniority") },
      ]}
      footer={
        <SourcesBlock
          pageId="rightToRefuse"
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

      <OfficerLearningModuleCallout
        slug="joint-workplace-committees"
        moduleNumber={10}
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
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="ontarioScope"
        title={t("ontarioScope.title")}
        intro={t("ontarioScope.intro")}
      >
        <GuideTipGrid className="mt-4">
          {ontarioScopeKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`ontarioScope.items.${key}.label`)}
              content={t(`ontarioScope.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="stageOne"
        title={t("stageOne.title")}
        intro={t("stageOne.intro")}
      >
        <GuideTipGrid className="mt-4">
          {stageOneKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`stageOne.items.${key}.label`)}
              content={t(`stageOne.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("stageOne.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="stageTwo"
        title={t("stageTwo.title")}
        intro={t("stageTwo.intro")}
      >
        <GuideTipGrid className="mt-4">
          {stageTwoKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`stageTwo.items.${key}.label`)}
              content={t(`stageTwo.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("stageTwo.warningTitle")}
          </p>
          <p className="mt-1">{t("stageTwo.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="reassignment"
        title={t("reassignment.title")}
        intro={t("reassignment.intro")}
      >
        <GuideTipGrid className="mt-4">
          {reassignmentKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`reassignment.items.${key}.label`)}
              content={t(`reassignment.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="reprisal"
        title={t("reprisal.title")}
        intro={t("reprisal.intro")}
      >
        <GuideTipGrid className="mt-4">
          {reprisalKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`reprisal.items.${key}.label`)}
              content={t(`reprisal.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("reprisal.warningTitle")}
          </p>
          <p className="mt-1">{t("reprisal.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="fullScenario"
        title={t("fullScenario.title")}
        intro={t("fullScenario.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {fullScenarioKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`fullScenario.phases.${key}.label`)}
              </span>
              {" — "}
              {t(`fullScenario.phases.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullScenario.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="stewardChecklist"
        title={t("stewardChecklist.title")}
        intro={t("stewardChecklist.intro")}
      >
        <GuideTipGrid className="mt-4">
          {stewardChecklistKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`stewardChecklist.items.${key}.label`)}
              content={t(`stewardChecklist.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="boards"
        title={t("boards.title")}
        intro={t("boards.body")}
      >
        <GuideActionRow>
          <Link
            href="/tools/qr-card?preset=rightToRefuse"
            className={guideCtaClass}
          >
            {t("boards.exportCta")}
          </Link>
        </GuideActionRow>
        <p className="mt-3 text-sm text-gray-700">{t("boards.exportHint")}</p>
      </GuideSection>
    </GuideLayout>
  );
}


