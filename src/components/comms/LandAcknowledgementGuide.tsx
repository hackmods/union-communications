import { getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
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
const workshopPrepKeys = ["who", "materials", "room", "followUp"] as const;
const workshopAgendaKeys = ["open", "research", "draft", "close"] as const;
const worksheetFeatureKeys = ["print", "ruled", "checklist"] as const;
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
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {groundRuleKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`groundRules.items.${key}.label`)}
              content={t(`groundRules.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="whyPrinciples"
        title={t("whyPrinciples.title")}
        intro={t("whyPrinciples.intro")}
      >
        <SubHeading>{t("whyPrinciples.whyHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {whyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`whyPrinciples.why.${key}.label`)}
              content={t(`whyPrinciples.why.${key}.content`)}
            />
          ))}
        </ul>
        <SubHeading className="mt-8">{t("whyPrinciples.principlesHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {principleKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`whyPrinciples.principles.${key}.label`)}
              content={t(`whyPrinciples.principles.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("whyPrinciples.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="howToWrite"
        title={t("howToWrite.title")}
        intro={t("howToWrite.intro")}
      >
        <SubHeading>{t("howToWrite.soloHeading")}</SubHeading>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
          {t("howToWrite.soloIntro")}
        </p>
        <LandAcknowledgementWritingFlowDiagram
          steps={soloFlowSteps}
          className="mt-4"
        />

        <SubHeading className="mt-8">{t("howToWrite.workshopHeading")}</SubHeading>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("howToWrite.workshopIntro")}
        </p>
        <SubHeading className="mt-6">{t("howToWrite.workshopPrepHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {workshopPrepKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`howToWrite.workshopPrep.${key}.label`)}
              content={t(`howToWrite.workshopPrep.${key}.content`)}
            />
          ))}
        </ul>
        <SubHeading className="mt-6">{t("howToWrite.workshopAgendaHeading")}</SubHeading>
        <ol className="mt-3 list-decimal space-y-4 pl-5 text-gray-700">
          {workshopAgendaKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`howToWrite.workshopAgenda.${key}.label`)}
              </span>
              {" — "}
              {t(`howToWrite.workshopAgenda.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("howToWrite.workshopTip")}</p>
        </Callout>

        <div className="mt-8 max-w-prose">
          <SubHeading>{t("howToWrite.worksheetHeading")}</SubHeading>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
            {worksheetFeatureKeys.map((key) => (
              <li key={key}>
                <span className="font-semibold text-opseu-dark">
                  {t(`howToWrite.worksheetFeatures.${key}.label`)}
                </span>
                {" — "}
                {t(`howToWrite.worksheetFeatures.${key}.content`)}
              </li>
            ))}
          </ul>
          <LandAcknowledgementWorksheetButton className="mt-4" />
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {t("howToWrite.worksheetHint")}
          </p>
        </div>
      </GuideSection>

      <GuideSection
        id="prepareWords"
        title={t("prepareWords.title")}
        intro={t("prepareWords.intro")}
      >
        <SubHeading>{t("prepareWords.researchHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {researchKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`prepareWords.research.${key}.label`)}
              content={t(`prepareWords.research.${key}.content`)}
            />
          ))}
        </ul>

        <SubHeading className="mt-8">{t("prepareWords.termsHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {termKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`prepareWords.terms.${key}.label`)}
              content={t(`prepareWords.terms.${key}.content`)}
            />
          ))}
        </ul>

        <SubHeading className="mt-8">{t("prepareWords.exampleHeading")}</SubHeading>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
          {t("prepareWords.exampleIntro")}
        </p>
        <Callout tone="warning" className="mt-4 max-w-prose">
          <p className="font-semibold text-amber-950">{t("prepareWords.exampleBadge")}</p>
        </Callout>
        <div className="mt-6 space-y-8">
          {workedExampleKeys.map((key) => (
            <figure key={key} className="max-w-prose">
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
        <SubHeading>{t("atMeeting.whenHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {whenKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`atMeeting.when.${key}.label`)}
              content={t(`atMeeting.when.${key}.content`)}
            />
          ))}
        </ul>
        <SubHeading className="mt-8">{t("atMeeting.orderHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {orderKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`atMeeting.order.${key}.label`)}
              content={t(`atMeeting.order.${key}.content`)}
            />
          ))}
        </ul>
        <SubHeading className="mt-8">{t("atMeeting.formatHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {formatKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`atMeeting.formats.${key}.label`)}
              content={t(`atMeeting.formats.${key}.content`)}
            />
          ))}
        </ul>
        <div className="button-row mt-5 max-w-lg">
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
        <ul className="mt-4 list-disc space-y-4 pl-5 text-gray-700">
          {unionKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`unionPractice.items.${key}.label`)}
              </span>
              {" — "}
              {t(`unionPractice.items.${key}.content`)}
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="goFurther"
        title={t("goFurther.title")}
        intro={t("goFurther.intro")}
      >
        <SubHeading>{t("goFurther.eldersHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {elderKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`goFurther.elders.${key}.label`)}
              content={t(`goFurther.elders.${key}.content`)}
            />
          ))}
        </ul>
        <SubHeading className="mt-8">{t("goFurther.actionHeading")}</SubHeading>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {actionKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`goFurther.action.${key}.label`)}
              content={t(`goFurther.action.${key}.content`)}
            />
          ))}
        </ul>
        <SubHeading className="mt-8">{t("goFurther.bargainingHeading")}</SubHeading>
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
          {t("goFurther.bargainingIntro")}
        </p>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-700">
          {bargainingKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`goFurther.bargaining.${key}.label`)}
              content={t(`goFurther.bargaining.${key}.content`)}
            />
          ))}
        </ul>
        <div className="button-row mt-5 max-w-lg">
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
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {nextStepKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`nextSteps.items.${key}.label`)}
              </span>
              {" — "}
              {t(`nextSteps.items.${key}.content`)}
            </li>
          ))}
        </ol>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/guide/resources" className={guideCtaOutlineClass}>
            {t("nextSteps.resourcesCta")}
          </Link>
          <LandAcknowledgementWorksheetButton />
        </div>
      </GuideSection>
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

function SubHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`text-base font-bold text-opseu-dark md:text-lg ${className ?? ""}`}
    >
      {children}
    </h3>
  );
}

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
