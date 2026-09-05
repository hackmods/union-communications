import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { StrikeCommandDiagram, StrikeRhythmsDiagram, StrikeGatesDiagram } from "@/components/comms/StewardGuideDiagrams";
import { StrikeStandingBriefButton } from "@/components/comms/StrikeStandingBriefButton";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/strike", params);
}

const TOC = [
  ["gate", "gate"],
  ["command", "command"],
  ["readiness", "readiness"],
  ["kit", "kit"],
  ["coverage", "coverage"],
  ["tactics", "tactics"],
  ["line", "line"],
  ["captains", "captains"],
  ["membership", "membership"],
  ["money", "money"],
  ["safety", "safety"],
  ["allies", "allies"],
  ["visit", "visit"],
  ["rhythms", "rhythms"],
  ["checklist", "checklist"],
  ["return", "return"],
  ["fullScenario", "fullScenario"],
  ["failureModes", "failureModes"],
  ["notThis", "notThis"],
  ["tools", "tools"],
] as const;

const gateKeys = ["lawful", "clock", "voice", "files"] as const;
const commandKeys = ["names", "executive", "committee", "captains", "promises"] as const;
const readinessKeys = ["people", "places", "money", "reach", "hardship"] as const;
const kitKeys = ["captainBag", "gateKit", "weather", "food", "signs", "paper"] as const;
const coverageKeys = ["countDoors", "bodies", "shiftLength", "reliefMath", "lunch"] as const;
const coverageRowKeys = ["thin", "working", "deep"] as const;
const tacticKeys = ["mapDoors", "early", "liveDoor", "publicSide", "notThis"] as const;
const lineKeys = ["locations", "rotations", "access", "visitors", "brief"] as const;
const captainKeys = ["nightBefore", "huddle", "talk", "chants", "flyers"] as const;
const talkKeys = ["member", "driver", "manager", "media", "visitor"] as const;
const chantKeys = ["fairContract", "whoRuns", "together"] as const;
const membershipKeys = ["turnout", "missing", "rumours", "care"] as const;
const moneyKeys = ["distinguish", "facts", "record", "public"] as const;
const safetyKeys = ["emergency", "noDare", "escalate", "deescalate"] as const;
const allyKeys = ["ask", "coordinator", "sameFacts"] as const;
const visitKeys = ["callFirst", "namedGate", "followCaptain", "noSpeak", "noFilm"] as const;
const rhythmKeys = ["internal", "public", "captainsFirst"] as const;
const checklistKeys = [
  "names",
  "gate",
  "kit",
  "doors",
  "early",
  "fallback",
  "hardship",
  "emergency",
  "flyers",
  "captainsFirst",
  "visitors",
  "returnWatch",
] as const;
const roleKeys = ["executive", "committee", "captains", "spokesperson"] as const;
const returnKeys = ["lastDay", "firstShift", "retaliation"] as const;
const scenarioKeys = ["t530", "t545", "t600", "t615", "t630", "t700", "t800"] as const;
const failureKeys = [
  "split",
  "money",
  "emptyGates",
  "lateOpen",
  "sideDoor",
  "visitSpeak",
  "contradiction",
  "wildcat",
  "noWatch",
] as const;
const notThisKeys = ["crisis", "bargaining", "wildcat", "illegal", "national"] as const;
const toolKeys = [
  "crisis",
  "bargaining",
  "brief",
  "mapping",
  "flyer",
  "qr",
  "website",
  "consent",
  "board",
  "email",
] as const;

export default async function StrikeOpsGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("strikeOpsGuide");
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
            { href: "/guide/crisis", label: nav("crisisCommsGuide") },
            {
              href: "/guide/bargaining",
              label: nav("bargainingGuide"),
              variant: "outline",
            },
            {
              href: "/tools/board-notice",
              label: nav("boardNotice"),
              variant: "outline",
            },
            {
              href: "/guide/photo-consent",
              label: nav("photoConsent"),
              variant: "outline",
            },
            {
              href: "/tools/flyer-maker",
              label: nav("flyerMaker"),
              variant: "outline",
            },
            {
              href: "/tools/qr-card",
              label: nav("qrCard"),
              variant: "outline",
            },
            {
              href: "/tools/website-template",
              label: nav("websiteTemplate"),
              variant: "outline",
            },
            {
              href: "/guide/workplace-mapping",
              label: nav("workplaceMappingGuide"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/crisis", label: nav("crisisCommsGuide") },
        { href: "/guide/bargaining", label: nav("bargainingGuide") },
        { href: "/guide/photo-consent", label: nav("photoConsent") },
        { href: "/tools/flyer-maker", label: nav("flyerMaker") },
        { href: "/tools/qr-card", label: nav("qrCard") },
        { href: "/tools/website-template", label: nav("websiteTemplate") },
        { href: "/guide/workplace-mapping", label: nav("workplaceMappingGuide") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
        { href: "/guide/officer-learning", label: nav("officerLearningGuide") },
      ]}
      footer={
        <SourcesBlock pageId="strike" title={ts("title")} intro={ts("intro")} />
      }
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("disclaimer.body")}</p>
      </Callout>

      <OfficerLearningModuleCallout
        slug="building-collective-power"
        moduleNumber={6}
      />

      <StrikeCommandDiagram
        className="mb-8"
        labels={{
          executive: t("diagram.executive"),
          committee: t("diagram.committee"),
          captains: t("diagram.captains"),
          members: t("diagram.members"),
        }}
        caption={t("diagram.caption")}
      />

      <GuideSection id="gate" title={t("gate.title")} intro={t("gate.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {gateKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`gate.items.${key}.label`)}
              content={t(`gate.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="command" title={t("command.title")} intro={t("command.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {commandKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`command.items.${key}.label`)}
              content={t(`command.items.${key}.content`)}
            />
          ))}
        </ul>
        <RolesTable
          caption={t("command.roles.caption")}
          headers={{
            job: t("command.roles.headers.job"),
            who: t("command.roles.headers.who"),
            notThis: t("command.roles.headers.notThis"),
          }}
          rows={roleKeys.map((key) => ({
            key,
            job: t(`command.roles.rows.${key}.job`),
            who: t(`command.roles.rows.${key}.who`),
            notThis: t(`command.roles.rows.${key}.notThis`),
          }))}
        />
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("command.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="readiness" title={t("readiness.title")} intro={t("readiness.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {readinessKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`readiness.items.${key}.label`)}
              content={t(`readiness.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("readiness.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="kit" title={t("kit.title")} intro={t("kit.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {kitKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`kit.items.${key}.label`)}
              content={t(`kit.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("kit.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="coverage" title={t("coverage.title")} intro={t("coverage.intro")}>
        <StrikeGatesDiagram
          className="mt-5"
          labels={{
            main: t("coverage.diagram.main"),
            side: t("coverage.diagram.side"),
            dock: t("coverage.diagram.dock"),
          }}
          caption={t("coverage.diagram.caption")}
        />
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {coverageKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`coverage.items.${key}.label`)}
              content={t(`coverage.items.${key}.content`)}
            />
          ))}
        </ul>
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">{t("coverage.worked")}</p>
        <CoverageTable
          caption={t("coverage.table.caption")}
          headers={{
            band: t("coverage.table.headers.band"),
            bodies: t("coverage.table.headers.bodies"),
            layout: t("coverage.table.headers.layout"),
          }}
          rows={coverageRowKeys.map((key) => ({
            key,
            band: t(`coverage.table.rows.${key}.band`),
            bodies: t(`coverage.table.rows.${key}.bodies`),
            layout: t(`coverage.table.rows.${key}.layout`),
          }))}
        />
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("coverage.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="tactics" title={t("tactics.title")} intro={t("tactics.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {tacticKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`tactics.items.${key}.label`)}
              content={t(`tactics.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("tactics.warningTitle")}</p>
          <p className="mt-1">{t("tactics.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="line" title={t("line.title")} intro={t("line.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {lineKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`line.items.${key}.label`)}
              content={t(`line.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("line.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="captains" title={t("captains.title")} intro={t("captains.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {captainKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`captains.items.${key}.label`)}
              content={t(`captains.items.${key}.content`)}
            />
          ))}
        </ul>
        <TalkTable
          caption={t("captains.talk.caption")}
          headers={{
            who: t("captains.talk.headers.who"),
            say: t("captains.talk.headers.say"),
          }}
          rows={talkKeys.map((key) => ({
            key,
            who: t(`captains.talk.rows.${key}.who`),
            say: t(`captains.talk.rows.${key}.say`),
          }))}
        />
        <ChantTable
          caption={t("captains.chants.caption")}
          headers={{
            call: t("captains.chants.headers.call"),
            response: t("captains.chants.headers.response"),
            when: t("captains.chants.headers.when"),
          }}
          rows={chantKeys.map((key) => ({
            key,
            call: t(`captains.chants.rows.${key}.call`),
            response: t(`captains.chants.rows.${key}.response`),
            when: t(`captains.chants.rows.${key}.when`),
          }))}
        />
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">{t("captains.chants.technique")}</p>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">{t("captains.flyers.body")}</p>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/tools/flyer-maker" className={guideCtaClass}>
            {nav("flyerMaker")}
          </Link>
          <Link href="/tools/qr-card" className={guideCtaOutlineClass}>
            {nav("qrCard")}
          </Link>
          <Link href="/tools/website-template" className={guideCtaOutlineClass}>
            {nav("websiteTemplate")}
          </Link>
        </div>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("captains.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="membership" title={t("membership.title")} intro={t("membership.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {membershipKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`membership.items.${key}.label`)}
              content={t(`membership.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("membership.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="money" title={t("money.title")} intro={t("money.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {moneyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`money.items.${key}.label`)}
              content={t(`money.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("money.warningTitle")}</p>
          <p className="mt-1">{t("money.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="safety" title={t("safety.title")} intro={t("safety.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {safetyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`safety.items.${key}.label`)}
              content={t(`safety.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("safety.warningTitle")}</p>
          <p className="mt-1">{t("safety.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="allies" title={t("allies.title")} intro={t("allies.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {allyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`allies.items.${key}.label`)}
              content={t(`allies.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("allies.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="visit" title={t("visit.title")} intro={t("visit.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {visitKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`visit.items.${key}.label`)}
              content={t(`visit.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("visit.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="rhythms" title={t("rhythms.title")} intro={t("rhythms.intro")}>
        <StrikeRhythmsDiagram
          className="mt-5"
          labels={{
            internal: t("rhythms.diagram.internal"),
            captainsFirst: t("rhythms.diagram.captainsFirst"),
            public: t("rhythms.diagram.public"),
          }}
          caption={t("rhythms.diagram.caption")}
        />
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {rhythmKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`rhythms.items.${key}.label`)}
              content={t(`rhythms.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("rhythms.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/guide/crisis" className={guideCtaOutlineClass}>
            {t("rhythms.crisisCta")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="checklist" title={t("checklist.title")} intro={t("checklist.intro")}>
        <ChecklistFigure
          items={checklistKeys.map((key) => ({
            key,
            label: t(`checklist.items.${key}.label`),
            content: t(`checklist.items.${key}.content`),
          }))}
        />
        <p className="mt-4 max-w-prose text-sm text-gray-700">{t("checklist.exportHint")}</p>
        <div className="mt-4">
          <StrikeStandingBriefButton />
        </div>
      </GuideSection>

      <GuideSection id="return" title={t("return.title")} intro={t("return.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {returnKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`return.items.${key}.label`)}
              content={t(`return.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("return.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="fullScenario" title={t("fullScenario.title")} intro={t("fullScenario.intro")}>
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {scenarioKeys.map((key) => (
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

      <GuideSection id="failureModes" title={t("failureModes.title")} intro={t("failureModes.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {failureKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`failureModes.items.${key}.label`)}
              content={t(`failureModes.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("failureModes.tip")}</p>
        </Callout>
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
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/guide/crisis" className={guideCtaOutlineClass}>
            {nav("crisisCommsGuide")}
          </Link>
          <Link href="/guide/bargaining" className={guideCtaOutlineClass}>
            {nav("bargainingGuide")}
          </Link>
        </div>
      </GuideSection>

      <section
        id="tools"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">{t("tools.title")}</h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">{t("tools.intro")}</p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {toolKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`tools.items.${key}.label`)}
              content={t(`tools.items.${key}.content`)}
            />
          ))}
        </ul>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/guide/crisis" className={guideCtaClass}>
            {nav("crisisCommsGuide")}
          </Link>
          <Link href="/guide/bargaining" className={guideCtaOutlineClass}>
            {nav("bargainingGuide")}
          </Link>
          <StrikeStandingBriefButton />
          <Link href="/guide/photo-consent" className={guideCtaOutlineClass}>
            {nav("photoConsent")}
          </Link>
          <Link href="/guide/workplace-mapping" className={guideCtaOutlineClass}>
            {nav("workplaceMappingGuide")}
          </Link>
          <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
            {nav("flyerMaker")}
          </Link>
          <Link href="/tools/qr-card" className={guideCtaOutlineClass}>
            {nav("qrCard")}
          </Link>
          <Link href="/tools/website-template" className={guideCtaOutlineClass}>
            {nav("websiteTemplate")}
          </Link>
          <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
            {nav("boardNotice")}
          </Link>
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {nav("emailBroadcastGuide")}
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

function ChecklistFigure({
  items,
}: {
  items: { key: string; label: string; content: string }[];
}) {
  return (
    <ul className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
      {items.map((item) => (
        <li key={item.key} className="flex gap-3 px-4 py-3">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 border-opseu-blue/40",
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 max-w-prose leading-relaxed">
            <span className="font-semibold text-opseu-dark">{item.label}.</span>{" "}
            <span className="text-gray-700">{item.content}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CoverageTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: { band: string; bodies: string; layout: string };
  rows: { key: string; band: string; bodies: string; layout: string }[];
}) {
  return (
    <figure className="mt-6 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-xs text-gray-600">{caption}</caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-opseu-dark">
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.band}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.bodies}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.layout}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100 align-top">
              <th scope="row" className="px-3 py-2 font-medium text-opseu-dark">
                {row.band}
              </th>
              <td className="px-3 py-2 text-gray-700">{row.bodies}</td>
              <td className="px-3 py-2 text-gray-700">{row.layout}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function TalkTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: { who: string; say: string };
  rows: { key: string; who: string; say: string }[];
}) {
  return (
    <figure className="mt-6 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-xs text-gray-600">{caption}</caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-opseu-dark">
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.who}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.say}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100 align-top">
              <th scope="row" className="px-3 py-2 font-medium text-opseu-dark">
                {row.who}
              </th>
              <td className="px-3 py-2 text-gray-700">{row.say}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function ChantTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: { call: string; response: string; when: string };
  rows: { key: string; call: string; response: string; when: string }[];
}) {
  return (
    <figure className="mt-6 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-xs text-gray-600">{caption}</caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-opseu-dark">
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.call}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.response}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.when}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100 align-top">
              <th scope="row" className="px-3 py-2 font-medium text-opseu-dark">
                {row.call}
              </th>
              <td className="px-3 py-2 text-gray-700">{row.response}</td>
              <td className="px-3 py-2 text-gray-700">{row.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function RolesTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: { job: string; who: string; notThis: string };
  rows: { key: string; job: string; who: string; notThis: string }[];
}) {
  return (
    <figure className="mt-6 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-xs text-gray-600">{caption}</caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-opseu-dark">
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.job}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.who}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.notThis}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100 align-top">
              <th scope="row" className="px-3 py-2 font-medium text-opseu-dark">
                {row.job}
              </th>
              <td className="px-3 py-2 text-gray-700">{row.who}</td>
              <td className="px-3 py-2 text-gray-700">{row.notThis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
