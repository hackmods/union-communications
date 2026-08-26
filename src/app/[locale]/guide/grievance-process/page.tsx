import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

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
] as const;

const gateKeys = [
  "informal",
  "grievance",
  "refusal",
  "bump",
  "joint",
] as const;
const sixWKeys = ["who", "what", "where", "when", "why", "want"] as const;
const clockKeys = ["trigger", "count", "extension", "late"] as const;
const jobKeys = ["informal", "written", "referral"] as const;
const meetingKeys = ["speak", "notes", "member"] as const;
const workedFileKeys = ["d0", "d1", "d3", "d7"] as const;
const failureModeKeys = [
  "missedClock",
  "noArticle",
  "mixedForum",
  "hallwayPromise",
  "emptyFile",
] as const;

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
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
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
        <div className="button-row mt-5">
          <Link href="/tools/document-generator?preset=grievance-intake">
            <Button>{t("investigation.worksheetCta")}</Button>
          </Link>
        </div>
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

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
        <div className="button-row mt-4">
          <Link href="/app/grievances">
            <Button>{t("hub.cta")}</Button>
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
