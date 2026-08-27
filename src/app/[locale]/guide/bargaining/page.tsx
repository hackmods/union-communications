import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
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
  ["notThis", "notThis"],
  ["tools", "tools"],
] as const;

const gateKeys = ["sector", "committee", "rep", "ca"] as const;
const prepKeys = ["survey", "demand", "notice"] as const;
const tableKeys = ["exchange", "blackout", "tracking"] as const;
const commsKeys = ["cadence", "channels", "facts", "crisis"] as const;
const trackerKeys = ["article", "status", "device", "csv"] as const;
const disputeKeys = ["conciliation", "strikeVote", "noBoard"] as const;
const ratifyKeys = ["ta", "ratification", "signing"] as const;
const checklistKeys = [
  "survey",
  "notice",
  "tracker",
  "updates",
  "vote",
  "noboard",
  "ratify",
  "export",
] as const;
const scenarioKeys = ["t90", "table", "vote", "noboard", "ratify"] as const;
const notThisKeys = ["crisis", "grievance", "joint", "wildcat"] as const;
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
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/crisis", label: nav("strikeGuide") },
        { href: "/tools/proposal-tracker", label: nav("proposalTracker") },
        { href: "/guide/officer-learning", label: nav("officerLearningGuide") },
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
        slug="building-collective-power"
        moduleNumber={6}
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

      <nav className="mb-8 flex flex-wrap gap-2" aria-label={t("tocLabel")}>
        {TOC.map(([id, key]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            {t(`${key}.navLabel`)}
          </a>
        ))}
      </nav>

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
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {prepKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`prep.items.${key}.label`)}
              content={t(`prep.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("prep.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/guide/workplace-mapping" className={guideCtaOutlineClass}>
            {nav("workplaceMappingGuide")}
          </Link>
          <Link href="/guide/membership-signup" className={guideCtaOutlineClass}>
            {nav("membershipSignupGuide")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="table" title={t("table.title")} intro={t("table.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {tableKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`table.items.${key}.label`)}
              content={t(`table.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("table.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="comms" title={t("comms.title")} intro={t("comms.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {commsKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`comms.items.${key}.label`)}
              content={t(`comms.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("comms.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {nav("emailBroadcastGuide")}
          </Link>
          <Link
            href="/tools/graphic-maker?preset=bargainingUpdate"
            className={guideCtaOutlineClass}
          >
            {nav("graphicMaker")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="tracker"
        title={t("tracker.title")}
        intro={t("tracker.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {trackerKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`tracker.items.${key}.label`)}
              content={t(`tracker.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tracker.calloutTitle")}</p>
          <p className="mt-1">{t("tracker.calloutBody")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/proposal-tracker" className={guideCtaClass}>
            {t("tracker.cta")}
          </Link>
        </div>
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
        <ul className="mt-6 list-disc space-y-3 pl-5 text-gray-700">
          {disputeKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`dispute.items.${key}.label`)}
              content={t(`dispute.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("dispute.warningTitle")}
          </p>
          <p className="mt-1">{t("dispute.warning")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/guide/crisis" className={guideCtaOutlineClass}>
            {t("dispute.crisisCta")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="ratify"
        title={t("ratify.title")}
        intro={t("ratify.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {ratifyKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`ratify.items.${key}.label`)}
              content={t(`ratify.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("ratify.tip")}</p>
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
        id="notThis"
        title={t("notThis.title")}
        intro={t("notThis.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {notThisKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`notThis.items.${key}.label`)}
              content={t(`notThis.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <section
        id="tools"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("tools.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("tools.intro")}
        </p>
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
          <Link href="/tools/flyer-maker" className={guideCtaOutlineClass}>
            {nav("flyerMaker")}
          </Link>
          <Link href="/guide/workplace-mapping" className={guideCtaOutlineClass}>
            {nav("workplaceMappingGuide")}
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
