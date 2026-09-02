import { getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { Link } from "@/i18n/navigation";
import { guideCtaOutlineClass } from "@/components/comms/guideCtaClasses";

const TOC = [
  ["why", "why"],
  ["principles", "principles"],
  ["whenWhere", "whenWhere"],
  ["unionPractice", "unionPractice"],
  ["agenda", "agenda"],
  ["formats", "formats"],
  ["learn", "learn"],
  ["workedExample", "workedExample"],
  ["terminology", "terminology"],
  ["elders", "elders"],
  ["action", "action"],
  ["bargaining", "bargaining"],
  ["nextSteps", "nextSteps"],
  ["notThis", "notThis"],
] as const;

const whyKeys = ["presence", "treaties", "reconciliation", "beyondToken", "labour"] as const;
const principleKeys = ["reflection", "territory", "action", "relationship"] as const;
const whenWhereKeys = ["meetings", "events", "comms", "virtual", "everyone"] as const;
const unionKeys = ["opseu", "ofl", "cupe", "bcgeu", "others"] as const;
const agendaKeys = ["order", "respect", "bilingual", "plenary", "facilitator"] as const;
const formatKeys = ["inPerson", "online", "hybrid", "personalize"] as const;
const learnKeys = ["research", "elders", "accuracy", "context", "friendship"] as const;
const workedExampleKeys = ["territory", "action", "covenant"] as const;
const termKeys = ["nations", "treaties", "turtleIsland", "dish", "capitalize"] as const;
const elderKeys = ["when", "invite", "protocol", "honorarium", "notDefault"] as const;
const actionKeys = ["support", "learn", "relationships", "accountability", "trc"] as const;
const bargainingKeys = ["language", "leave", "workforce", "elders", "allLocals"] as const;
const nextStepKeys = ["read", "reflect", "followUp", "community", "national"] as const;
const notThisKeys = ["generator", "script", "once", "substitute", "burden"] as const;

export async function LandAcknowledgementGuide() {
  const t = await getTranslations("landAcknowledgementGuide");
  const nav = await getTranslations("nav");
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
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </Callout>

      <GuideSection id="why" title={t("why.title")} intro={t("why.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {whyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`why.items.${key}.label`)}
              content={t(`why.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("why.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="principles"
        title={t("principles.title")}
        intro={t("principles.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {principleKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`principles.items.${key}.label`)}
              content={t(`principles.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="whenWhere"
        title={t("whenWhere.title")}
        intro={t("whenWhere.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {whenWhereKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`whenWhere.items.${key}.label`)}
              content={t(`whenWhere.items.${key}.content`)}
            />
          ))}
        </ul>
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
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("unionPractice.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="agenda" title={t("agenda.title")} intro={t("agenda.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {agendaKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`agenda.items.${key}.label`)}
              content={t(`agenda.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("agenda.warningTitle")}</p>
          <p className="mt-1">{t("agenda.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="formats" title={t("formats.title")} intro={t("formats.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {formatKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`formats.items.${key}.label`)}
              content={t(`formats.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="learn" title={t("learn.title")} intro={t("learn.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {learnKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`learn.items.${key}.label`)}
              content={t(`learn.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("learn.resourcesTitle")}</p>
          <p className="mt-1">{t("learn.resourcesIntro")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="workedExample"
        title={t("workedExample.title")}
        intro={t("workedExample.intro")}
      >
        <Callout tone="warning" className="mt-4 max-w-prose">
          <p className="font-semibold text-amber-950">{t("workedExample.badge")}</p>
        </Callout>
        <div className="mt-6 space-y-8">
          {workedExampleKeys.map((key) => (
            <figure key={key} className="max-w-prose">
              <blockquote className="border-l-4 border-opseu-blue/35 pl-4 text-gray-800 leading-relaxed">
                {t(`workedExample.blocks.${key}.text`)}
              </blockquote>
              <figcaption className="mt-3 text-gray-700 leading-relaxed">
                <span className="font-semibold text-opseu-dark">
                  {t(`workedExample.blocks.${key}.label`)}
                </span>
                {" — "}
                {t(`workedExample.blocks.${key}.annotation`)}
              </figcaption>
            </figure>
          ))}
        </div>
        <Callout tone="warning" className="mt-6 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("workedExample.warningTitle")}
          </p>
          <p className="mt-1">{t("workedExample.warning")}</p>
        </Callout>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("workedExample.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="terminology"
        title={t("terminology.title")}
        intro={t("terminology.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {termKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`terminology.items.${key}.label`)}
              content={t(`terminology.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="elders" title={t("elders.title")} intro={t("elders.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {elderKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`elders.items.${key}.label`)}
              content={t(`elders.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="action"
        title={t("action.title")}
        intro={t("action.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {actionKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`action.items.${key}.label`)}
              content={t(`action.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("action.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="bargaining"
        title={t("bargaining.title")}
        intro={t("bargaining.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {bargainingKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`bargaining.items.${key}.label`)}
              content={t(`bargaining.items.${key}.content`)}
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
          <Link href="/guide/running-meetings" className={guideCtaOutlineClass}>
            {nav("runningMeetingsGuide")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="notThis" title={t("notThis.title")} intro={t("notThis.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {notThisKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`notThis.items.${key}.label`)}
              content={t(`notThis.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("notThis.warningTitle")}</p>
          <p className="mt-1">{t("notThis.warning")}</p>
        </Callout>
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

function TipItem({ label, content }: { label: string; content: string }) {
  return (
    <li className="max-w-prose leading-relaxed">
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </li>
  );
}
