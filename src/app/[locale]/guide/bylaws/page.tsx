import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import {
  AmendmentFlowDiagram,
  DocumentHierarchyDiagram,
  QuorumTiersDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import { BylawsReferenceSheetButton } from "@/components/comms/BylawsReferenceSheetButton";
import {
  guideCtaClass,
  guideCtaClassBlock,
  guideCtaOutlineClass,
  guideCtaOutlineClassBlock,
} from "@/components/comms/guideCtaClasses";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/bylaws", params);
}

const TOC = [
  ["gate", "gate"],
  ["mustHave", "mustHave"],
  ["amend", "amend"],
  ["scenario", "scenario"],
  ["checklist", "checklist"],
  ["examples", "examples"],
  ["failureModes", "failureModes"],
  ["reference", "reference"],
  ["tools", "tools"],
] as const;

const gateKeys = ["constitution", "bylaws", "policy", "ca"] as const;
const mustHaveKeys = [
  "executive",
  "quorum",
  "signing",
  "elections",
  "meetings",
  "finances",
  "amendments",
] as const;
const amendKeys = ["notice", "gmm", "threshold", "approval"] as const;
const scenarioKeys = ["d0", "d1", "d2", "d3", "d4", "d5", "d6"] as const;
const checklistKeys = [
  "readConstitution",
  "comparePeers",
  "draftText",
  "postNotice",
  "quorumMath",
  "gmmVote",
  "submitNational",
  "publishMembers",
] as const;
const exampleKeys = ["cupe", "unifor", "opseu", "shared"] as const;
const failureKeys = [
  "lecOnly",
  "policyAsBylaw",
  "noNotice",
  "conflict",
  "noApproval",
] as const;
const toolKeys = ["builder", "boardNotice", "orgChart", "email", "letterhead"] as const;

export default async function BylawsGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bylawsGuide");
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
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/tools/bylaw-builder", label: nav("bylawBuilder") },
        { href: "/tools/org-chart", label: nav("orgChart") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
      ]}
      footer={
        <SourcesBlock
          pageId="bylaws"
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
        slug="democratic-governance"
        moduleNumber={4}
      />

      <GuideSection id="gate" title={t("gate.title")} intro={t("gate.intro")}>
        <DocumentHierarchyDiagram
          className="mt-5"
          labels={{
            constitution: t("diagrams.hierarchy.constitution"),
            bylaws: t("diagrams.hierarchy.bylaws"),
            policy: t("diagrams.hierarchy.policy"),
            ca: t("diagrams.hierarchy.ca"),
          }}
          caption={t("diagrams.hierarchy.caption")}
        />
        <ul className="mt-6 list-disc space-y-3 pl-5 text-gray-700">
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

      <GuideSection
        id="mustHave"
        title={t("mustHave.title")}
        intro={t("mustHave.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {mustHaveKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`mustHave.items.${key}.label`)}
              content={t(`mustHave.items.${key}.content`)}
            />
          ))}
        </ul>
        <h3 className="mt-8 text-lg font-bold text-opseu-dark">
          {t("diagrams.quorum.title")}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-700">
          {t("diagrams.quorum.intro")}
        </p>
        <QuorumTiersDiagram
          className="mt-4"
          tiers={[
            {
              label: t("diagrams.quorum.tier1Label"),
              body: t("diagrams.quorum.tier1"),
            },
            {
              label: t("diagrams.quorum.tier2Label"),
              body: t("diagrams.quorum.tier2"),
            },
            {
              label: t("diagrams.quorum.tier3Label"),
              body: t("diagrams.quorum.tier3"),
            },
          ]}
          caption={t("diagrams.quorum.caption")}
        />
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("mustHave.tip")}</p>
        </Callout>
        <p className="mt-4 max-w-prose text-sm text-gray-600">
          {t("mustHave.electionsDeepen")}{" "}
          <Link
            href="/guide/officer-learning/democratic-governance"
            className="font-semibold text-opseu-blue underline underline-offset-2"
          >
            {t("related.governance")}
          </Link>
          .
        </p>
      </GuideSection>

      <GuideSection id="amend" title={t("amend.title")} intro={t("amend.intro")}>
        <AmendmentFlowDiagram
          className="mt-5"
          labels={{
            notice: t("diagrams.amendment.notice"),
            gmm: t("diagrams.amendment.gmm"),
            approval: t("diagrams.amendment.approval"),
            publish: t("diagrams.amendment.publish"),
          }}
          caption={t("diagrams.amendment.caption")}
        />
        <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-700">
          {amendKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`amend.items.${key}.label`)}
              </span>
              {" — "}
              {t(`amend.items.${key}.content`)}
            </li>
          ))}
        </ol>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("amend.warningTitle")}
          </p>
          <p className="mt-1">{t("amend.warning")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-2xl">
          <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
            {t("amend.boardNoticeCta")}
          </Link>
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {t("amend.emailCta")}
          </Link>
          <Link
            href="/tools/document-generator?preset=quick-event"
            className={guideCtaOutlineClass}
          >
            {t("amend.eventCta")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="scenario"
        title={t("scenario.title")}
        intro={t("scenario.intro")}
      >
        <ScenarioTable
          caption={t("scenario.tableCaption")}
          headers={{
            day: t("scenario.headers.day"),
            action: t("scenario.headers.action"),
            artifact: t("scenario.headers.artifact"),
          }}
          rows={scenarioKeys.map((key) => ({
            key,
            day: t(`scenario.phases.${key}.label`),
            action: t(`scenario.phases.${key}.content`),
            artifact: t(`scenario.phases.${key}.artifact`),
          }))}
        />
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("scenario.tip")}</p>
        </Callout>
        <div className="button-row mt-5 max-w-lg">
          <Link href="/tools/bylaw-builder?preset=campus" className={guideCtaClass}>
            {t("scenario.builderCta")}
          </Link>
        </div>
      </GuideSection>

      <GuideSection
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <ChecklistFigure
          caption={t("checklist.caption")}
          items={checklistKeys.map((key) => ({
            label: t(`checklist.items.${key}.label`),
            content: t(`checklist.items.${key}.content`),
          }))}
        />
        <div className="mt-4">
          <BylawsReferenceSheetButton kind="adoption" />
        </div>
      </GuideSection>

      <GuideSection
        id="examples"
        title={t("examples.title")}
        intro={t("examples.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {exampleKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`examples.items.${key}.label`)}
              content={t(`examples.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("examples.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="failureModes"
        title={t("failureModes.title")}
        intro={t("failureModes.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {failureKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`failureModes.items.${key}.label`)}
              content={t(`failureModes.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <section
        id="reference"
        className="mt-12 scroll-mt-28 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-opseu-blue/[0.03] p-5 shadow-sm md:p-8"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("reference.navLabel")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("reference.intro")}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ReferenceBlock title={t("referenceMaterials.adoption.title")}>
            <p>{t("referenceMaterials.adoption.body")}</p>
            <BylawsReferenceSheetButton kind="adoption" className="mt-3" />
          </ReferenceBlock>
          <ReferenceBlock title={t("referenceMaterials.quorum.title")}>
            <p>{t("referenceMaterials.quorum.body")}</p>
            <BylawsReferenceSheetButton kind="quorum" className="mt-3" />
          </ReferenceBlock>
          <ReferenceBlock title={t("referenceMaterials.builder.title")}>
            <p>{t("referenceMaterials.builder.body")}</p>
            <Link
              href="/tools/bylaw-builder?preset=campus"
              className={`mt-3 inline-block w-full ${guideCtaClassBlock}`}
            >
              {t("referenceMaterials.builder.cta")}
            </Link>
          </ReferenceBlock>
          <ReferenceBlock title={t("referenceMaterials.governance.title")}>
            <p>{t("referenceMaterials.governance.body")}</p>
            <Link
              href="/guide/officer-learning/democratic-governance"
              className={`mt-3 inline-block w-full ${guideCtaOutlineClassBlock}`}
            >
              {t("referenceMaterials.governance.cta")}
            </Link>
          </ReferenceBlock>
        </div>
      </section>

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
          <Link href="/tools/bylaw-builder?preset=campus" className={guideCtaClass}>
            {nav("bylawBuilder")}
          </Link>
          <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
            {nav("boardNotice")}
          </Link>
          <Link href="/tools/org-chart" className={guideCtaOutlineClass}>
            {nav("orgChart")}
          </Link>
          <Link
            href="/tools/document-generator?preset=letterhead"
            className={guideCtaOutlineClass}
          >
            {nav("documentGenerator")}
          </Link>
        </div>
      </section>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("example.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("example.body")}</p>
      </Callout>
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
  caption,
  items,
}: {
  caption: string;
  items: { label: string; content: string }[];
}) {
  return (
    <figure className="mt-5 max-w-prose rounded-lg border border-gray-200 bg-white p-4">
      <figcaption className="text-sm font-semibold text-opseu-dark">
        {caption}
      </figcaption>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex gap-3 text-sm leading-relaxed text-gray-700"
          >
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 text-xs text-gray-400"
              aria-hidden="true"
            >
              ☐
            </span>
            <span>
              <span className="font-semibold text-opseu-dark">{item.label}.</span>{" "}
              {item.content}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function ScenarioTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: { day: string; action: string; artifact: string };
  rows: { key: string; day: string; action: string; artifact: string }[];
}) {
  return (
    <figure className="mt-5 max-w-3xl overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <caption className="mb-3 caption-top text-left text-sm text-gray-600">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {(
              [headers.day, headers.action, headers.artifact] as const
            ).map((header) => (
              <th
                key={header}
                scope="col"
                className="px-3 py-2 text-left font-semibold text-opseu-dark"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100 align-top">
              <td className="px-3 py-2 font-medium text-opseu-dark whitespace-nowrap">
                {row.day}
              </td>
              <td className="px-3 py-2 text-gray-700">{row.action}</td>
              <td className="px-3 py-2 text-gray-700">{row.artifact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function ReferenceBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-bold text-opseu-dark">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}
