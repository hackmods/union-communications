import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import {
  PhysicalShiftDiagram,
  SocialMapDiagram,
  SupportScaleDiagram,
} from "@/components/comms/WorkplaceMappingDiagrams";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { SpreadsheetXlsxButton } from "@/components/comms/SpreadsheetXlsxButton";
import {
  GuideLayout,
  GuideActionRow,
  GuideBulletList,
  GuideCallout,
  GuideCatalogCard,
  GuideOutlineList,
  GuideOutlineStep,
  GuideProse,
  GuideSection,
  GuideTipGrid,
  GuideTipItem,
  GuideWideFigure,
} from "@/components/comms/guide-ui";

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

export default async function WorkplaceMappingGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workplaceMappingGuide");
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
            { href: "/tools/org-chart", label: nav("orgChart") },
            {
              href: "/tools/board-notice",
              label: nav("boardNotice"),
              variant: "outline",
            },
          ]}
        />
      }
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
      <GuideCallout tone="warning" className="mb-8">
        <p className="font-semibold text-amber-950">{t("sensitive.title")}</p>
        <p className="mt-2 leading-relaxed">
          {t.rich("sensitive.body", richMarks)}
        </p>
      </GuideCallout>

      <OfficerLearningModuleCallout
        slug="mobilizer-bargaining-partner"
        moduleNumber={7}
      />

      <div className="mb-8">
        <GuideActionRow className="mt-0">
          <a
            href={TEMPLATE_HREF}
            download={TEMPLATE_DOWNLOAD}
            className={guideCtaClass}
          >
            {t("downloadCta")}
          </a>
          <SpreadsheetXlsxButton
            csvHref={TEMPLATE_HREF}
            downloadBasename={TEMPLATE_DOWNLOAD}
            buttonClassName="min-h-11 px-4 text-base font-semibold"
          />
        </GuideActionRow>
        <GuideProse className="mt-2 text-sm text-gray-600">
          {t("downloadHint")}
        </GuideProse>
      </div>

      <GuideSection id="gate" title={t("gate.title")} intro={t("gate.intro")}>
        <GuideTipGrid>
          {gateKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`gate.items.${key}.label`)}
              content={t(`gate.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
          <Link
            href="/guide/dfr"
            className="mt-2 inline-block font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.dfr")} →
          </Link>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="physical"
        title={t("physical.title")}
        intro={t("physical.intro")}
      >
        <GuideWideFigure ariaLabel={t("physical.diagramLabel")}>
          <PhysicalShiftDiagram
            className="w-full"
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
        </GuideWideFigure>
        <GuideBulletList className="mt-5" columns={2}>
          {physicalKeys.map((key) => (
            <li key={key} className="leading-relaxed">
              {t(`physical.items.${key}`)}
            </li>
          ))}
        </GuideBulletList>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("physical.blindSpot")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="social"
        title={t("social.title")}
        intro={t.rich("social.intro", richMarks)}
      >
        <GuideWideFigure ariaLabel={t("social.diagramLabel")}>
          <SocialMapDiagram
            className="w-full"
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
        </GuideWideFigure>
        <GuideBulletList className="mt-5">
          {socialKeys.map((key) => (
            <li key={key} className="leading-relaxed">
              {t(`social.items.${key}`)}
            </li>
          ))}
        </GuideBulletList>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("social.goal")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="scale" title={t("scale.title")} intro={t("scale.intro")}>
        <GuideWideFigure ariaLabel={t("scale.diagramLabel")}>
          <SupportScaleDiagram
            className="w-full"
            ariaLabel={t("scale.diagramLabel")}
            items={scaleKeys.map((key, index) => ({
              id: key,
              number: String(index + 1),
              label: t(`scale.diagram.${key}`),
            }))}
          />
        </GuideWideFigure>
        <GuideTipGrid className="mt-5" columns={3} dense>
          {scaleKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`scale.items.${key}.label`)}
              content={t(`scale.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("scale.spendTitle")}</p>
          <p className="mt-1">{t("scale.spend")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="conversations"
        title={t("conversations.title")}
        intro={t("conversations.intro")}
      >
        <GuideTipGrid>
          {conversationKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`conversations.items.${key}.label`)}
              content={t(`conversations.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="muted" className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("conversations.tip")}</p>
        </GuideCallout>
        <GuideProse className="mt-4">
          <Link
            href="/guide/membership-signup"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.membership")} →
          </Link>
        </GuideProse>
      </GuideSection>

      <GuideSection id="worked" title={t("worked.title")} intro={t("worked.intro")}>
        <GuideOutlineList className="mt-4 space-y-6">
          {workedKeys.map((key, index) => (
            <GuideOutlineStep
              key={key}
              id={`worked-${key}`}
              step={index + 1}
              title={t(`worked.phases.${key}.label`)}
            >
              <GuideProse className="mt-2">
                {t(`worked.phases.${key}.content`)}
              </GuideProse>
            </GuideOutlineStep>
          ))}
        </GuideOutlineList>
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
        <GuideCallout tone="muted" className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("worked.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="keep" title={t("keep.title")} intro={t("keep.intro")}>
        <GuideTipGrid>
          {keepKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`keep.items.${key}.label`)}
              content={t(`keep.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("privacy.title")}</p>
          <p className="mt-1">{t("privacy.body")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="reference"
        title={t("reference.title")}
        intro={t("reference.intro")}
      >
        <ul className="mt-5 grid list-none gap-6 p-0 sm:grid-cols-2">
          <GuideCatalogCard
            title={t("reference.blank.title")}
            body={t("reference.blank.body")}
            meta={t("downloadHint")}
            action={
              <>
                <a
                  href={TEMPLATE_HREF}
                  download={TEMPLATE_DOWNLOAD}
                  className={guideCtaOutlineClass}
                >
                  {t("downloadCta")}
                </a>
                <SpreadsheetXlsxButton
                  csvHref={TEMPLATE_HREF}
                  downloadBasename={TEMPLATE_DOWNLOAD}
                />
              </>
            }
          />
          <GuideCatalogCard
            title={t("reference.example.title")}
            body={t("reference.example.body")}
            action={
              <>
                <a
                  href={EXAMPLE_HREF}
                  download={EXAMPLE_DOWNLOAD}
                  className={guideCtaOutlineClass}
                >
                  {t("reference.example.cta")}
                </a>
                <SpreadsheetXlsxButton
                  csvHref={EXAMPLE_HREF}
                  downloadBasename={EXAMPLE_DOWNLOAD}
                />
              </>
            }
          />
          <GuideCatalogCard
            title={t("reference.orgChart.title")}
            body={t("reference.orgChart.body")}
            action={
              <Link href="/tools/org-chart" className={guideCtaOutlineClass}>
                {t("related.orgChart")} →
              </Link>
            }
          />
          <GuideCatalogCard
            title={t("reference.membership.title")}
            body={t("reference.membership.body")}
            action={
              <Link
                href="/guide/membership-signup"
                className={guideCtaOutlineClass}
              >
                {t("related.membership")} →
              </Link>
            }
          />
        </ul>
      </GuideSection>
    </GuideLayout>
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
    <GuideWideFigure className="mt-5 overflow-x-auto">
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
              <td className="px-3 py-2 font-medium text-opseu-dark">
                {row.name}
              </td>
              <td className="px-3 py-2 text-gray-700">{row.shift}</td>
              <td className="px-3 py-2 text-gray-700">{row.leader}</td>
              <td className="px-3 py-2 text-gray-700">{row.score}</td>
              <td className="px-3 py-2 text-gray-700">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </GuideWideFigure>
  );
}
