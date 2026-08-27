import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/grievance-process", params);
}

const TOC = [
  ["gate", "gate"],
  ["investigation", "investigation"],
  ["clocks", "clocks"],
  ["steps", "steps"],
  ["meeting", "meeting"],
  ["workedFile", "workedFile"],
  ["failureModes", "failureModes"],
  ["memberTalk", "memberTalk"],
  ["checklist", "checklist"],
  ["worksheet", "worksheet"],
  ["tools", "tools"],
] as const;

const gateKeys = [
  "informal",
  "grievance",
  "refusal",
  "bump",
  "joint",
] as const;
const flowKeys = [
  "start",
  "safety",
  "bump",
  "system",
  "informal",
  "file",
] as const;
const sixWKeys = ["who", "what", "where", "when", "why", "want"] as const;
const clockKeys = ["trigger", "count", "extension", "late"] as const;
const jobKeys = ["informal", "written", "referral"] as const;
const exampleTableRows = ["step1", "step2", "step3"] as const;
const meetingKeys = ["speak", "notes", "member"] as const;
const workedFileKeys = ["d0", "d1", "d3", "d7"] as const;
const failureModeKeys = [
  "missedClock",
  "noArticle",
  "mixedForum",
  "hallwayPromise",
  "emptyFile",
] as const;
const memberTalkKeys = ["promise", "status", "meeting", "denial"] as const;
const checklistKeys = [
  "forum",
  "trigger",
  "article",
  "remedy",
  "worksheet",
  "calendar",
  "coverage",
  "memberUpdate",
] as const;
const worksheetKeys = ["columns", "witness", "footer"] as const;
const toolKeys = [
  "worksheet",
  "diagnostic",
  "discipline",
  "dfr",
  "hub",
  "ca",
] as const;

const linkButtonClass =
  "inline-flex w-full items-center justify-center rounded-lg bg-opseu-blue px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

const linkButtonOutlineClass =
  "inline-flex w-full items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-base font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
};

export default async function GrievanceProcessGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("grievanceGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/steward-101", label: t("related.steward101") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/guide/seniority-bumping", label: t("related.seniority") },
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
        { href: "/guide/joint-committee", label: t("related.jointCommittee") },
      ]}
      footer={
        <SourcesBlock
          pageId="grievanceProcess"
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
        <ForumFlowFigure
          title={t("gate.flowTitle")}
          caption={t("gate.flowCaption")}
          items={flowKeys.map((key) => ({
            key,
            label: t(`gate.flowItems.${key}.label`),
            content: t(`gate.flowItems.${key}.content`),
          }))}
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
        <nav
          className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
          aria-label={t("gate.seeAlsoLabel")}
        >
          {(
            [
              { href: "/guide/steward-101", label: t("related.steward101") },
              { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
              { href: "/guide/seniority-bumping", label: t("related.seniority") },
              {
                href: "/guide/joint-committee",
                label: t("related.jointCommittee"),
              },
            ] as const
          ).map((link, i) => (
            <span key={link.href} className="inline-flex items-baseline gap-x-3">
              {i > 0 && (
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
              )}
              <Link
                href={link.href}
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </GuideSection>

      <GuideSection
        id="investigation"
        title={t("investigation.title")}
        intro={t("investigation.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {sixWKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`investigation.items.${key}.label`)}
              content={t(`investigation.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("investigation.tip")}</p>
        </Callout>
        <Callout tone="warning" className="mt-4 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("investigation.leaveOutTitle")}
          </p>
          <p className="mt-1">{t("investigation.leaveOut")}</p>
        </Callout>
        <p className="mt-5 text-sm">
          <Link
            href="#worksheet"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("investigation.worksheetJump")}
          </Link>
        </p>
      </GuideSection>

      <GuideSection
        id="clocks"
        title={t("clocks.title")}
        intro={t("clocks.intro")}
      >
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("clocks.warningTitle")}
          </p>
          <p className="mt-1">{t("clocks.warning")}</p>
        </Callout>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {clockKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`clocks.items.${key}.label`)}
              content={t(`clocks.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="steps" title={t("steps.title")} intro={t("steps.intro")}>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">
            {t("steps.exampleTitle")}
          </p>
          <p className="mt-1">{t("steps.example")}</p>
        </Callout>
        <ExampleStepsTable
          caption={t("steps.exampleTable.caption")}
          headers={{
            step: t("steps.exampleTable.headers.step"),
            ft: t("steps.exampleTable.headers.ft"),
            pt: t("steps.exampleTable.headers.pt"),
          }}
          rows={exampleTableRows.map((key) => ({
            key,
            step: t(`steps.exampleTable.rows.${key}.step`),
            ft: t(`steps.exampleTable.rows.${key}.ft`),
            pt: t(`steps.exampleTable.rows.${key}.pt`),
          }))}
        />
        {jobKeys.map((key) => (
          <div key={key} className="mt-8">
            <h3 className="text-lg font-bold text-opseu-dark">
              {t(`steps.jobs.${key}.title`)}
            </h3>
            <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
              {t.rich(`steps.jobs.${key}.body`, richMarks)}
            </p>
          </div>
        ))}
      </GuideSection>

      <GuideSection
        id="meeting"
        title={t("meeting.title")}
        intro={t("meeting.intro")}
      >
        <Callout tone="warning" className="mt-5 max-w-prose">
          <p className="font-semibold text-amber-950">
            {t("meeting.warningTitle")}
          </p>
          <p className="mt-1">{t("meeting.warning")}</p>
        </Callout>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {meetingKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`meeting.items.${key}.label`)}
              content={t(`meeting.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="workedFile"
        title={t("workedFile.title")}
        intro={t("workedFile.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {workedFileKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`workedFile.items.${key}.label`)}
              content={t(`workedFile.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("workedFile.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="failureModes"
        title={t("failureModes.title")}
        intro={t("failureModes.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {failureModeKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`failureModes.items.${key}.label`)}
              content={t(`failureModes.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="memberTalk"
        title={t("memberTalk.title")}
        intro={t("memberTalk.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {memberTalkKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`memberTalk.items.${key}.label`)}
              content={t(`memberTalk.items.${key}.content`)}
            />
          ))}
        </ul>
        <p className="mt-5 text-sm">
          <Link
            href="/guide/dfr"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {t("related.dfr")}
          </Link>
        </p>
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

      <section
        id="worksheet"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5 not-first:mt-12"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("worksheet.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("worksheet.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {worksheetKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`worksheet.items.${key}.label`)}
              content={t(`worksheet.items.${key}.content`)}
            />
          ))}
        </ul>
        <div className="button-row mt-5 max-w-lg">
          <Link
            href="/tools/document-generator?preset=grievance-intake"
            className={linkButtonClass}
          >
            {t("worksheet.exportCta")}
          </Link>
        </div>
        <p className="mt-3 text-sm text-gray-700">{t("worksheet.exportHint")}</p>
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
          <Link
            href="/tools/complaint-vs-grievance"
            className={linkButtonOutlineClass}
          >
            {t("tools.items.diagnostic.label")}
          </Link>
          <Link
            href="/tools/document-generator?preset=grievance-intake"
            className={linkButtonOutlineClass}
          >
            {t("worksheet.exportCta")}
          </Link>
          <Link href="/guide/dfr" className={linkButtonOutlineClass}>
            {t("related.dfr")}
          </Link>
          <Link href="/app/grievances" className={linkButtonOutlineClass}>
            {t("hub.cta")}
          </Link>
        </div>
      </section>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
        <div className="button-row mt-4">
          <Link href="/app/grievances" className={linkButtonClass}>
            {t("hub.cta")}
          </Link>
        </div>
      </Callout>

      <p className="mt-8 max-w-prose text-sm leading-relaxed text-gray-600">
        {t("sourcesNote")}
      </p>
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

function ForumFlowFigure({
  title,
  caption,
  items,
}: {
  title: string;
  caption: string;
  items: { key: string; label: string; content: string }[];
}) {
  return (
    <figure className="mt-5 max-w-prose rounded-xl border border-gray-200 bg-gray-50/80 p-4 md:p-5">
      <figcaption className="text-sm font-semibold text-opseu-dark">
        {title}
      </figcaption>
      <p className="mt-1 text-sm text-gray-600">{caption}</p>
      <ol className="mt-4 space-y-0">
        {items.map((item, index) => (
          <li key={item.key} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex shrink-0 flex-col items-center">
              <span
                className="flex size-7 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              {index < items.length - 1 ? (
                <span
                  className="mt-1 w-px flex-1 bg-opseu-blue/25"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="min-w-0 pb-1">
              <p className="font-semibold text-opseu-dark">{item.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">
                {item.content}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function ExampleStepsTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: { step: string; ft: string; pt: string };
  rows: { key: string; step: string; ft: string; pt: string }[];
}) {
  return (
    <figure className="mt-5 max-w-2xl overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <caption className="mb-3 caption-top text-left text-sm text-gray-600">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th
              scope="col"
              className="px-3 py-2 text-left font-semibold text-opseu-dark"
            >
              {headers.step}
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left font-semibold text-opseu-dark"
            >
              {headers.ft}
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left font-semibold text-opseu-dark"
            >
              {headers.pt}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100">
              <th
                scope="row"
                className="px-3 py-2 font-medium text-opseu-dark"
              >
                {row.step}
              </th>
              <td className="px-3 py-2 text-gray-700">{row.ft}</td>
              <td className="px-3 py-2 text-gray-700">{row.pt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
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
