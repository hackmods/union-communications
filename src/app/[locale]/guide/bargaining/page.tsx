import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideActionRow, GuideSection, GuideTipGrid, GuideTipItem } from "@/components/comms/guide-ui";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import {
  BargainingLifecycleDiagram,
  NoBoardCountdownDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/bargaining", params);
}

const TOC = [
  ["gate", "gate"],
  ["prep", "prep"],
  ["table", "table"],
  ["comms", "comms"],
  ["tracker", "tracker"],
  ["dispute", "dispute"],
  ["ratify", "ratify"],
  ["checklist", "checklist"],
  ["fullScenario", "fullScenario"],
  ["failureModes", "failureModes"],
  ["notThis", "notThis"],
  ["tools", "tools"],
] as const;

const gateKeys = ["sector", "committee", "rep", "ca"] as const;
const prepKeys = ["survey", "demand", "notice"] as const;
const tableKeys = ["exchange", "blackout", "tracking"] as const;
const commsKeys = ["cadence", "channels", "facts", "crisis"] as const;
const trackerKeys = ["article", "status", "device", "csv"] as const;
const disputeKeys = [
  "conciliation",
  "strikeVote",
  "voteMechanics",
  "noBoard",
] as const;
const ratifyKeys = [
  "ta",
  "national",
  "eligibility",
  "ratification",
  "reject",
  "signing",
] as const;
const checklistKeys = [
  "survey",
  "notice",
  "tracker",
  "updates",
  "vote",
  "noboard",
  "national",
  "ratify",
  "export",
] as const;
const scenarioKeys = ["t90", "table", "vote", "noboard", "ratify"] as const;
const failureKeys = [
  "turnout",
  "leak",
  "noHighlights",
  "rejected",
  "wrongDate",
] as const;
const notThisKeys = ["crisis", "strike", "grievance", "joint", "wildcat"] as const;
const toolKeys = ["tracker", "email", "graphic", "flyer", "mapping"] as const;
const sectorKeys = ["lra", "ccba"] as const;

export default async function BargainingGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bargainingGuide");
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
            { href: "/tools/proposal-tracker", label: nav("proposalTracker") },
            {
              href: "/tools/graphic-maker?preset=bargainingUpdate",
              label: nav("graphicMaker"),
              variant: "outline",
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
        { href: "/guide/strike", label: nav("strikeOpsGuide") },
        { href: "/guide/crisis", label: nav("crisisCommsGuide") },
        { href: "/guide/grievance-process", label: nav("grievanceProcessGuide") },
        { href: "/guide/joint-committee", label: nav("jointCommitteeGuide") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
        { href: "/guide/workplace-mapping", label: nav("workplaceMappingGuide") },
        { href: "/guide/membership-signup", label: nav("membershipSignupGuide") },
        { href: "/guide/officer-learning", label: nav("officerLearningGuide") },
        { href: "/tools/proposal-tracker", label: nav("proposalTracker") },
      ]}
      footer={
        <SourcesBlock
          pageId="bargaining"
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
        slug="mobilizer-bargaining-partner"
        moduleNumber={7}
      />

      <BargainingLifecycleDiagram
        className="mb-8"
        labels={{
          prep: t("diagram.prep"),
          table: t("diagram.table"),
          dispute: t("diagram.dispute"),
          ratify: t("diagram.ratify"),
        }}
        caption={t("diagram.caption")}
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
        <SectorForkTable
          caption={t("gate.sectorCaption")}
          headers={{
            question: t("gate.sectorHeaders.question"),
            lra: t("gate.sectorHeaders.lra"),
            ccba: t("gate.sectorHeaders.ccba"),
          }}
          rows={sectorKeys.map((key) => ({
            key,
            question: t(`gate.sectorRows.${key}.question`),
            lra: t(`gate.sectorRows.${key}.lra`),
            ccba: t(`gate.sectorRows.${key}.ccba`),
          }))}
        />
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="prep" title={t("prep.title")} intro={t("prep.intro")}>
        <GuideTipGrid className="mt-4">
          {prepKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`prep.items.${key}.label`)}
              content={t(`prep.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("prep.tip")}</p>
        </Callout>
        <GuideActionRow>
          <Link href="/guide/workplace-mapping" className={guideCtaOutlineClass}>
            {nav("workplaceMappingGuide")}
          </Link>
          <Link href="/guide/membership-signup" className={guideCtaOutlineClass}>
            {nav("membershipSignupGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection id="table" title={t("table.title")} intro={t("table.intro")}>
        <GuideTipGrid className="mt-4">
          {tableKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`table.items.${key}.label`)}
              content={t(`table.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("table.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="comms" title={t("comms.title")} intro={t("comms.intro")}>
        <GuideTipGrid className="mt-4">
          {commsKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`comms.items.${key}.label`)}
              content={t(`comms.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("comms.tip")}</p>
        </Callout>
        <GuideActionRow>
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {nav("emailBroadcastGuide")}
          </Link>
          <Link
            href="/tools/graphic-maker?preset=bargainingUpdate"
            className={guideCtaOutlineClass}
          >
            {nav("graphicMaker")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="tracker"
        title={t("tracker.title")}
        intro={t("tracker.intro")}
      >
        <GuideTipGrid className="mt-4">
          {trackerKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`tracker.items.${key}.label`)}
              content={t(`tracker.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tracker.calloutTitle")}</p>
          <p className="mt-1">{t("tracker.calloutBody")}</p>
        </Callout>
        <GuideActionRow>
          <Link href="/tools/proposal-tracker" className={guideCtaClass}>
            {t("tracker.cta")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="dispute"
        title={t("dispute.title")}
        intro={t("dispute.intro")}
      >
        <NoBoardCountdownDiagram
          className="mt-4"
          labels={{
            conciliation: t("dispute.diagram.conciliation"),
            noBoard: t("dispute.diagram.noBoard"),
            countdown: t("dispute.diagram.countdown"),
            legal: t("dispute.diagram.legal"),
          }}
          caption={t("dispute.diagram.caption")}
        />
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">
            {t("dispute.ccbaTitle")}
          </p>
          <p className="mt-1">{t("dispute.ccbaBody")}</p>
        </Callout>
        <GuideTipGrid className="mt-6">
          {disputeKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`dispute.items.${key}.label`)}
              content={t(`dispute.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("dispute.warningTitle")}
          </p>
          <p className="mt-1">{t("dispute.warning")}</p>
        </Callout>
        <GuideActionRow>
          <Link href="/guide/strike" className={guideCtaOutlineClass}>
            {t("dispute.strikeOpsCta")}
          </Link>
          <Link href="/guide/crisis" className={guideCtaOutlineClass}>
            {t("dispute.crisisCta")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="ratify"
        title={t("ratify.title")}
        intro={t("ratify.intro")}
      >
        <GuideTipGrid className="mt-4">
          {ratifyKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`ratify.items.${key}.label`)}
              content={t(`ratify.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("ratify.tip")}</p>
        </Callout>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("ratify.rejectTitle")}
          </p>
          <p className="mt-1">{t("ratify.rejectBody")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <ChecklistFigure
          items={checklistKeys.map((key) => ({
            key,
            label: t(`checklist.items.${key}.label`),
            content: t(`checklist.items.${key}.content`),
          }))}
        />
      </GuideSection>

      <GuideSection
        id="fullScenario"
        title={t("fullScenario.title")}
        intro={t("fullScenario.intro")}
      >
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

      <GuideSection
        id="failureModes"
        title={t("failureModes.title")}
        intro={t("failureModes.intro")}
      >
        <GuideTipGrid className="mt-4">
          {failureKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`failureModes.items.${key}.label`)}
              content={t(`failureModes.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("failureModes.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="notThis"
        title={t("notThis.title")}
        intro={t("notThis.intro")}
      >
        <GuideTipGrid className="mt-4">
          {notThisKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`notThis.items.${key}.label`)}
              content={t(`notThis.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link href="/guide/grievance-process" className={guideCtaOutlineClass}>
            {nav("grievanceProcessGuide")}
          </Link>
          <Link href="/guide/joint-committee" className={guideCtaOutlineClass}>
            {nav("jointCommitteeGuide")}
          </Link>
          <Link href="/guide/strike" className={guideCtaOutlineClass}>
            {nav("strikeOpsGuide")}
          </Link>
          <Link href="/guide/crisis" className={guideCtaOutlineClass}>
            {nav("crisisCommsGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="tools"
        title={t("tools.title")}
        intro={t("tools.intro")}
      >
        <GuideTipGrid>
          {toolKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`tools.items.${key}.label`)}
              content={t(`tools.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link href="/tools/proposal-tracker" className={guideCtaOutlineClass}>
            {nav("proposalTracker")}
          </Link>
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {nav("emailBroadcastGuide")}
          </Link>
          <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
            {nav("flyerMaker")}
          </Link>
          <Link href="/guide/workplace-mapping" className={guideCtaOutlineClass}>
            {nav("workplaceMappingGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>
    </GuideLayout>
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

function SectorForkTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: { question: string; lra: string; ccba: string };
  rows: { key: string; question: string; lra: string; ccba: string }[];
}) {
  return (
    <figure className="mt-6 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-xs text-gray-600">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-opseu-dark">
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.question}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.lra}
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              {headers.ccba}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100 align-top">
              <th
                scope="row"
                className="px-3 py-2 font-medium text-opseu-dark"
              >
                {row.question}
              </th>
              <td className="px-3 py-2 text-gray-700">{row.lra}</td>
              <td className="px-3 py-2 text-gray-700">{row.ccba}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
