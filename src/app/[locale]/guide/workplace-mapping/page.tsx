import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import {
  PhysicalShiftDiagram,
  SocialMapDiagram,
  SupportScaleDiagram,
} from "@/components/comms/WorkplaceMappingDiagrams";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/workplace-mapping", params);
}

const TEMPLATE_HREF = "/templates/unionops-workplace-map.csv";
const TEMPLATE_DOWNLOAD = "unionops-workplace-map.csv";
const EXAMPLE_HREF = "/templates/unionops-workplace-map-example.csv";
const EXAMPLE_DOWNLOAD = "unionops-workplace-map-example.csv";

const TOC = [
  ["gate", "gate"],
  ["physical", "physical"],
  ["social", "social"],
  ["scale", "scale"],
  ["conversations", "conversations"],
  ["worked", "worked"],
  ["keep", "keep"],
  ["reference", "reference"],
] as const;

const gateKeys = ["when", "who", "never"] as const;
const physicalKeys = ["department", "shift", "location", "breaks"] as const;
const physicalColumnKeys = ["days", "nights", "weekends"] as const;
const socialKeys = ["policy", "gifts", "newHires"] as const;
const scaleKeys = ["one", "two", "three", "four", "five"] as const;
const conversationKeys = ["listen", "connect", "ask", "log"] as const;
const workedKeys = ["list", "leader", "ones", "nights"] as const;
const keepKeys = ["update", "paper", "photo", "review"] as const;
const sampleRowKeys = [
  "priya",
  "jordan",
  "sam",
  "casey",
  "riley",
  "alex",
  "morgan",
  "quinn",
] as const;

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
};

const primaryDownloadClass =
  "inline-flex items-center justify-center rounded-lg bg-opseu-blue px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

const outlineDownloadClass =
  "inline-flex items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-base font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

export default async function WorkplaceMappingGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workplaceMappingGuide");
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
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/steward-101", label: t("related.steward101") },
        { href: "/guide/membership-signup", label: t("related.membership") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/tools/org-chart", label: t("related.orgChart") },
        { href: "/guide/union-boards", label: t("related.boards") },
      ]}
      footer={
        <SourcesBlock
          pageId="workplaceMapping"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <Callout tone="warning" className="mb-8 max-w-prose">
        <p className="font-semibold text-amber-950">{t("sensitive.title")}</p>
        <p className="mt-2 leading-relaxed">{t.rich("sensitive.body", richMarks)}</p>
      </Callout>

      <OfficerLearningModuleCallout slug="building-collective-power" moduleNumber={6} />

      <div className="mb-8">
        <a href={TEMPLATE_HREF} download={TEMPLATE_DOWNLOAD} className={primaryDownloadClass}>
          {t("downloadCta")}
        </a>
        <p className="mt-2 max-w-prose text-sm text-gray-600">{t("downloadHint")}</p>
      </div>

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
          <Link
            href="/guide/dfr"
            className="mt-2 inline-block font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.dfr")} →
          </Link>
        </Callout>
      </GuideSection>

      <GuideSection
        id="physical"
        title={t("physical.title")}
        intro={t("physical.intro")}
      >
        <PhysicalShiftDiagram
          className="mt-5 max-w-2xl"
          ariaLabel={t("physical.diagramLabel")}
          columns={physicalColumnKeys.map((key) => ({
            id: key,
            title: t(`physical.diagram.${key}.title`),
            items: [
              t(`physical.diagram.${key}.a`),
              t(`physical.diagram.${key}.b`),
            ],
          }))}
        />
        <ul className="mt-5 list-disc space-y-3 pl-5 text-gray-700">
          {physicalKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t(`physical.items.${key}`)}
            </li>
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("physical.blindSpot")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="social"
        title={t("social.title")}
        intro={t.rich("social.intro", richMarks)}
      >
        <SocialMapDiagram
          className="mt-5 max-w-md"
          ariaLabel={t("social.diagramLabel")}
          leader={t("social.diagram.leader")}
          around={[
            t("social.diagram.alex"),
            t("social.diagram.sam"),
            t("social.diagram.casey"),
            t("social.diagram.jordan"),
          ]}
          blindSpot={t("social.diagram.blindSpot")}
        />
        <ul className="mt-5 list-disc space-y-3 pl-5 text-gray-700">
          {socialKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              {t(`social.items.${key}`)}
            </li>
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("social.goal")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="scale" title={t("scale.title")} intro={t("scale.intro")}>
        <SupportScaleDiagram
          className="mt-5"
          ariaLabel={t("scale.diagramLabel")}
          items={scaleKeys.map((key, index) => ({
            id: key,
            number: String(index + 1),
            label: t(`scale.diagram.${key}`),
          }))}
        />
        <ul className="mt-5 list-disc space-y-3 pl-5 text-gray-700">
          {scaleKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`scale.items.${key}.label`)}
              </span>{" "}
              {t(`scale.items.${key}.content`)}
            </li>
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("scale.spendTitle")}</p>
          <p className="mt-1">{t("scale.spend")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="conversations"
        title={t("conversations.title")}
        intro={t("conversations.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {conversationKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`conversations.items.${key}.label`)}
              content={t(`conversations.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("conversations.tip")}</p>
        </Callout>
        <p className="mt-4 max-w-prose text-gray-700">
          <Link
            href="/guide/membership-signup"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.membership")} →
          </Link>
        </p>
      </GuideSection>

      <GuideSection id="worked" title={t("worked.title")} intro={t("worked.intro")}>
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {workedKeys.map((key) => (
            <li key={key} className="max-w-prose leading-relaxed">
              <span className="font-semibold text-opseu-dark">
                {t(`worked.phases.${key}.label`)}
              </span>
              {" — "}
              {t(`worked.phases.${key}.content`)}
            </li>
          ))}
        </ol>
        <SampleMapTable
          caption={t("worked.table.caption")}
          headers={{
            name: t("worked.table.headers.name"),
            shift: t("worked.table.headers.shift"),
            leader: t("worked.table.headers.leader"),
            score: t("worked.table.headers.score"),
            notes: t("worked.table.headers.notes"),
          }}
          rows={sampleRowKeys.map((key) => ({
            key,
            name: t(`worked.table.rows.${key}.name`),
            shift: t(`worked.table.rows.${key}.shift`),
            leader: t(`worked.table.rows.${key}.leader`),
            score: t(`worked.table.rows.${key}.score`),
            notes: t(`worked.table.rows.${key}.notes`),
          }))}
        />
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("worked.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection id="keep" title={t("keep.title")} intro={t("keep.intro")}>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {keepKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`keep.items.${key}.label`)}
              content={t(`keep.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">{t("privacy.title")}</p>
          <p className="mt-1">{t("privacy.body")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="reference"
        title={t("reference.title")}
        intro={t("reference.intro")}
      >
        <div className="mt-5 space-y-6">
          <ReferenceBlock title={t("reference.blank.title")}>
            <p>{t("reference.blank.body")}</p>
            <a
              href={TEMPLATE_HREF}
              download={TEMPLATE_DOWNLOAD}
              className={`mt-3 ${outlineDownloadClass}`}
            >
              {t("downloadCta")}
            </a>
            <p className="mt-2 text-sm text-gray-600">{t("downloadHint")}</p>
          </ReferenceBlock>
          <ReferenceBlock title={t("reference.example.title")}>
            <p>{t("reference.example.body")}</p>
            <a
              href={EXAMPLE_HREF}
              download={EXAMPLE_DOWNLOAD}
              className={`mt-3 ${outlineDownloadClass}`}
            >
              {t("reference.example.cta")}
            </a>
          </ReferenceBlock>
          <ReferenceBlock title={t("reference.orgChart.title")}>
            <p>{t("reference.orgChart.body")}</p>
            <Link
              href="/tools/org-chart"
              className={`mt-3 ${outlineDownloadClass}`}
            >
              {t("related.orgChart")}
            </Link>
          </ReferenceBlock>
          <ReferenceBlock title={t("reference.membership.title")}>
            <p>{t("reference.membership.body")}</p>
            <Link
              href="/guide/membership-signup"
              className={`mt-3 ${outlineDownloadClass}`}
            >
              {t("related.membership")}
            </Link>
          </ReferenceBlock>
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
  intro: ReactNode;
  children: ReactNode;
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

function ReferenceBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-prose rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-opseu-dark">{title}</h3>
      <div className="mt-2 text-gray-700">{children}</div>
    </div>
  );
}

function SampleMapTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: {
    name: string;
    shift: string;
    leader: string;
    score: string;
    notes: string;
  };
  rows: {
    key: string;
    name: string;
    shift: string;
    leader: string;
    score: string;
    notes: string;
  }[];
}) {
  return (
    <figure className="mt-5 max-w-3xl overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        <caption className="mb-3 caption-top text-left text-sm text-gray-600">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {(
              [
                headers.name,
                headers.shift,
                headers.leader,
                headers.score,
                headers.notes,
              ] as const
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
            <tr key={row.key} className="border-b border-gray-100">
              <td className="px-3 py-2 font-medium text-opseu-dark">{row.name}</td>
              <td className="px-3 py-2 text-gray-700">{row.shift}</td>
              <td className="px-3 py-2 text-gray-700">{row.leader}</td>
              <td className="px-3 py-2 text-gray-700">{row.score}</td>
              <td className="px-3 py-2 text-gray-700">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
