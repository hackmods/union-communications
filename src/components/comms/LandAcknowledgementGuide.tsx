import { getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import {
  GuideLayout,
  GuideSection,
  GuideSubHeading,
  GuideTipGrid,
  GuideTipItem,
  GuideWideFigure,
} from "@/components/comms/guide-ui";
import { Callout } from "@/components/ui/Callout";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { Link } from "@/i18n/navigation";
import { guideCtaOutlineClass } from "@/components/comms/guideCtaClasses";
import { LandAcknowledgementWritingFlowDiagram } from "@/components/comms/LandAcknowledgementWritingFlowDiagram";
import { LandAcknowledgementWorksheetButton } from "@/components/comms/LandAcknowledgementWorksheetButton";

const TOC = [
  ["groundRules", "groundRules"],
  ["whyPrinciples", "whyPrinciples"],
  ["howToWrite", "howToWrite"],
  ["prepareWords", "prepareWords"],
  ["atMeeting", "atMeeting"],
  ["unionPractice", "unionPractice"],
  ["goFurther", "goFurther"],
  ["nextSteps", "nextSteps"],
] as const;

const groundRuleKeys = ["noGenerator", "noScript", "deferLeadership", "wholeLocal"] as const;
const whyKeys = ["presence", "treaties", "reconciliation", "labour"] as const;
const principleKeys = ["reflection", "territory", "action", "relationship"] as const;
const soloFlowStepKeys = ["research", "reflect", "draft", "review"] as const;
const worksheetFeatureKeys = ["print", "ruled", "checklist"] as const;
const worksheetStepKeys = ["print", "research", "reflect", "draft", "review"] as const;
const researchKeys = ["research", "accuracy", "context", "friendship"] as const;
const termKeys = ["nations", "treaties", "turtleIsland", "dish", "capitalize"] as const;
const workedExampleKeys = ["territory", "action", "covenant"] as const;
const whenKeys = ["meetings", "events", "virtual", "comms"] as const;
const orderKeys = ["order", "respect", "bilingual", "facilitator"] as const;
const formatKeys = ["inPerson", "online", "hybrid"] as const;
const unionKeys = ["opseu", "ofl", "cupe", "bcgeu", "others"] as const;
const elderKeys = ["when", "invite", "protocol", "notDefault"] as const;
const actionKeys = ["support", "learn", "accountability", "trc"] as const;
const bargainingKeys = ["language", "leave", "workforce", "elders"] as const;
const nextStepKeys = ["read", "reflect", "followUp", "national"] as const;

export async function LandAcknowledgementGuide() {
  const t = await getTranslations("landAcknowledgementGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(TOC, (key) => t(`${key}.navLabel`));

  const soloFlowSteps = soloFlowStepKeys.map((key) => ({
    title: t(`howToWrite.soloFlow.${key}.title`),
    subtitle: t(`howToWrite.soloFlow.${key}.subtitle`),
  }));

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("tocLabel")}
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/running-meetings", label: nav("runningMeetingsGuide") },
        {
          href: "/guide/workshops/land-acknowledgement",
          label: nav("landAckWorkshopGuide"),
        },
        { href: "/guide/bargaining", label: nav("bargainingGuide") },
        { href: "/guide/resources", label: nav("resources") },
      ]}
      footer={
        <SourcesBlock
          pageId="landAcknowledgement"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <GuideSection
        id="groundRules"
        title={t("groundRules.title")}
        intro={t("groundRules.intro")}
      >
        <GuideTipGrid>
          {groundRuleKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`groundRules.items.${key}.label`)}
              content={t(`groundRules.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="whyPrinciples"
        title={t("whyPrinciples.title")}
        intro={t("whyPrinciples.intro")}
      >
        <GuideSubHeading>{t("whyPrinciples.whyHeading")}</GuideSubHeading>
        <GuideTipGrid className="mt-3">
          {whyKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`whyPrinciples.why.${key}.label`)}
              content={t(`whyPrinciples.why.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideSubHeading className="mt-8">
          {t("whyPrinciples.principlesHeading")}
        </GuideSubHeading>
        <GuideTipGrid className="mt-3">
          {principleKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`whyPrinciples.principles.${key}.label`)}
              content={t(`whyPrinciples.principles.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1 max-w-prose">{t("whyPrinciples.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="howToWrite"
        title={t("howToWrite.title")}
        intro={t("howToWrite.intro")}
      >
        <GuideSubHeading>{t("howToWrite.soloHeading")}</GuideSubHeading>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
          {t("howToWrite.soloIntro")}
        </p>
        <GuideWideFigure className="mt-4">
          <LandAcknowledgementWritingFlowDiagram steps={soloFlowSteps} />
        </GuideWideFigure>

        <Callout className="mt-8">
          <p className="font-semibold text-opseu-dark">
            {t("howToWrite.workshopCtaHeading")}
          </p>
          <p className="mt-1 max-w-prose">{t("howToWrite.workshopCtaBody")}</p>
          <div className="button-row mt-4">
            <Link
              href="/guide/workshops/land-acknowledgement"
              className={guideCtaOutlineClass}
            >
              {t("howToWrite.workshopCtaLabel")}
            </Link>
          </div>
        </Callout>

        <div className="mt-8">
          <GuideSubHeading>{t("howToWrite.worksheetHeading")}</GuideSubHeading>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
            {t("howToWrite.worksheetIntro")}
          </p>
          <GuideTipGrid className="mt-3" columns={3}>
            {worksheetFeatureKeys.map((key) => (
              <GuideTipItem
                key={key}
                label={t(`howToWrite.worksheetFeatures.${key}.label`)}
                content={t(`howToWrite.worksheetFeatures.${key}.content`)}
              />
            ))}
          </GuideTipGrid>
          <GuideSubHeading className="mt-6">
            {t("howToWrite.worksheetStepsHeading")}
          </GuideSubHeading>
          <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-gray-700 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
            {worksheetStepKeys.map((key) => (
              <li key={key} className="min-w-0 pl-1">
                {t(`howToWrite.worksheetSteps.${key}`)}
              </li>
            ))}
          </ol>
          <Callout className="mt-5">
            <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
            <p className="mt-1 max-w-prose">{t("howToWrite.worksheetGoldTip")}</p>
          </Callout>
          <LandAcknowledgementWorksheetButton className="mt-4" />
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
            {t("howToWrite.worksheetHint")}
          </p>
        </div>
      </GuideSection>

      <GuideSection
        id="prepareWords"
        title={t("prepareWords.title")}
        intro={t("prepareWords.intro")}
      >
        <GuideSubHeading>{t("prepareWords.researchHeading")}</GuideSubHeading>
        <GuideTipGrid className="mt-3">
          {researchKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`prepareWords.research.${key}.label`)}
              content={t(`prepareWords.research.${key}.content`)}
            />
          ))}
        </GuideTipGrid>

        <GuideSubHeading className="mt-8">
          {t("prepareWords.termsHeading")}
        </GuideSubHeading>
        <GuideTipGrid className="mt-3" columns={3}>
          {termKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`prepareWords.terms.${key}.label`)}
              content={t(`prepareWords.terms.${key}.content`)}
            />
          ))}
        </GuideTipGrid>

        <GuideSubHeading className="mt-8">
          {t("prepareWords.exampleHeading")}
        </GuideSubHeading>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
          {t("prepareWords.exampleIntro")}
        </p>
        <Callout tone="warning" className="mt-4">
          <p className="font-semibold text-amber-950">
            {t("prepareWords.exampleBadge")}
          </p>
        </Callout>
        <div className="mt-6 grid gap-6 lg:grid-cols-3 lg:gap-5">
          {workedExampleKeys.map((key) => (
            <figure key={key} className="min-w-0">
              <blockquote className="border-l-4 border-opseu-blue/35 pl-4 leading-relaxed text-gray-800">
                {t(`prepareWords.exampleBlocks.${key}.text`)}
              </blockquote>
              <figcaption className="mt-3 leading-relaxed text-gray-700">
                <span className="font-semibold text-opseu-dark">
                  {t(`prepareWords.exampleBlocks.${key}.label`)}
                </span>
                {" — "}
                {t(`prepareWords.exampleBlocks.${key}.annotation`)}
              </figcaption>
            </figure>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        id="atMeeting"
        title={t("atMeeting.title")}
        intro={t("atMeeting.intro")}
      >
        <GuideSubHeading>{t("atMeeting.whenHeading")}</GuideSubHeading>
        <GuideTipGrid className="mt-3">
          {whenKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`atMeeting.when.${key}.label`)}
              content={t(`atMeeting.when.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideSubHeading className="mt-8">{t("atMeeting.orderHeading")}</GuideSubHeading>
        <GuideTipGrid className="mt-3">
          {orderKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`atMeeting.order.${key}.label`)}
              content={t(`atMeeting.order.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideSubHeading className="mt-8">
          {t("atMeeting.formatHeading")}
        </GuideSubHeading>
        <GuideTipGrid className="mt-3" columns={3}>
          {formatKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`atMeeting.formats.${key}.label`)}
              content={t(`atMeeting.formats.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <div className="button-row mt-5">
          <Link href="/guide/running-meetings" className={guideCtaOutlineClass}>
            {nav("runningMeetingsGuide")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="unionPractice"
        title={t("unionPractice.title")}
        intro={t("unionPractice.intro")}
      >
        <GuideTipGrid columns={3}>
          {unionKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`unionPractice.items.${key}.label`)}
              content={t(`unionPractice.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="goFurther"
        title={t("goFurther.title")}
        intro={t("goFurther.intro")}
      >
        <GuideSubHeading>{t("goFurther.eldersHeading")}</GuideSubHeading>
        <GuideTipGrid className="mt-3">
          {elderKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`goFurther.elders.${key}.label`)}
              content={t(`goFurther.elders.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideSubHeading className="mt-8">{t("goFurther.actionHeading")}</GuideSubHeading>
        <GuideTipGrid className="mt-3">
          {actionKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`goFurther.action.${key}.label`)}
              content={t(`goFurther.action.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideSubHeading className="mt-8">
          {t("goFurther.bargainingHeading")}
        </GuideSubHeading>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("goFurther.bargainingIntro")}
        </p>
        <GuideTipGrid className="mt-3">
          {bargainingKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`goFurther.bargaining.${key}.label`)}
              content={t(`goFurther.bargaining.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <div className="button-row mt-5">
          <Link href="/guide/bargaining" className={guideCtaOutlineClass}>
            {nav("bargainingGuide")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="nextSteps"
        title={t("nextSteps.title")}
        intro={t("nextSteps.intro")}
      >
        <GuideTipGrid as="ol" className="list-none">
          {nextStepKeys.map((key, index) => (
            <li key={key} className="min-w-0 leading-relaxed text-gray-700">
              <span className="font-semibold text-opseu-dark">
                {index + 1}. {t(`nextSteps.items.${key}.label`)}
              </span>
              {" — "}
              {t(`nextSteps.items.${key}.content`)}
            </li>
          ))}
        </GuideTipGrid>
        <div className="button-row mt-5">
          <Link href="/guide/resources" className={guideCtaOutlineClass}>
            {t("nextSteps.resourcesCta")}
          </Link>
          <LandAcknowledgementWorksheetButton />
        </div>
      </GuideSection>
    </GuideLayout>
  );
}
