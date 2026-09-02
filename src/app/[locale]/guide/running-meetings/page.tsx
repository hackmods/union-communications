import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { Callout } from "@/components/ui/Callout";
import {
  MotionPrecedenceDiagram,
  QuorumTiersDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import { RunningMeetingsReferenceSheetButton } from "@/components/comms/RunningMeetingsReferenceSheetButton";
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
  ["quorum", "quorum"],
  ["agenda", "agenda"],
  ["motion", "motion"],
  ["precedence", "precedence"],
  ["debate", "debate"],
  ["voting", "voting"],
  ["failures", "failures"],
  ["scenario", "scenario"],
  ["tool", "tool"],
] as const;

const formalityKeys = ["executive", "gmm", "convention"] as const;
const chairKeys = ["referee", "neutral", "stepDown", "recognize"] as const;
const quorumKeys = ["check", "lost", "special"] as const;
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
const precedenceKeys = [
  "adjourn",
  "recess",
  "question",
  "table",
  "limit",
  "refer",
  "amend",
  "main",
] as const;
const debateKeys = ["recognize", "mover", "alternate", "time", "decorum"] as const;
const votingKeys = ["voice", "hands", "ballot", "majority", "twoThirds"] as const;
const failureKeys = [
  "noSecond",
  "chairDebates",
  "lostQuorum",
  "wrongOrder",
  "friendly",
] as const;
const scenarioKeys = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

export default async function RunningMeetingsGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("runningMeetingsGuide");
  const ol = await getTranslations("officerLearning.diagrams");
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
            {
              href: "/guide/bylaws",
              label: nav("bylawsGuide"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/land-acknowledgement", label: nav("landAcknowledgementGuide") },
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
        id="quorum"
        title={t("quorum.title")}
        intro={t("quorum.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {quorumKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`quorum.items.${key}.label`)}
              content={t(`quorum.items.${key}.content`)}
            />
          ))}
        </ul>
        <QuorumTiersDiagram
          className="mt-5 max-w-3xl"
          tiers={[
            {
              label: ol("quorumTier1Label"),
              body: ol("quorumTier1"),
            },
            {
              label: ol("quorumTier2Label"),
              body: ol("quorumTier2"),
            },
            {
              label: ol("quorumTier3Label"),
              body: ol("quorumTier3"),
            },
          ]}
          caption={ol("quorumCaption")}
        />
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("quorum.warningTitle")}</p>
          <p className="mt-1">{t("quorum.warning")}</p>
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
        <Callout className="mt-5 max-w-prose">
          <p className="leading-relaxed text-gray-700">{t("agenda.landAckNote")}</p>
          <p className="mt-3">
            <Link href="/guide/land-acknowledgement" className={guideCtaOutlineClass}>
              {nav("landAcknowledgementGuide")}
            </Link>
          </p>
        </Callout>
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

      <GuideSection
        id="precedence"
        title={t("precedence.title")}
        intro={t("precedence.intro")}
      >
        <MotionPrecedenceDiagram
          className="mt-4 max-w-2xl"
          steps={precedenceKeys.map((key) => ({
            label: t(`precedence.steps.${key}.label`),
            body: t(`precedence.steps.${key}.body`),
          }))}
          caption={t("precedence.caption")}
        />
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("precedence.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="debate"
        title={t("debate.title")}
        intro={t("debate.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {debateKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`debate.items.${key}.label`)}
              content={t(`debate.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="voting"
        title={t("voting.title")}
        intro={t("voting.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {votingKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`voting.items.${key}.label`)}
              content={t(`voting.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="failures"
        title={t("failures.title")}
        intro={t("failures.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {failureKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`failures.items.${key}.label`)}
              content={t(`failures.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="scenario"
        title={t("scenario.title")}
        intro={t("scenario.intro")}
      >
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {scenarioKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`scenario.phases.${key}.label`)}
              </span>
              {" — "}
              {t(`scenario.phases.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("scenario.tip")}</p>
        </Callout>
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
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          <li>{t("tool.items.cheatSheet")}</li>
          <li>{t("tool.items.pocketPdf")}</li>
          <li>{t("tool.items.notice")}</li>
        </ul>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/tools/rules-of-order" className={guideCtaClass}>
            {nav("rulesOfOrder")}
          </Link>
          <RunningMeetingsReferenceSheetButton />
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
