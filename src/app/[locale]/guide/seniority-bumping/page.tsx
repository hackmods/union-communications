import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { Callout } from "@/components/ui/Callout";
import { guideCtaClass } from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/seniority-bumping", params);
}

const TOC = [
  ["gate", "gate"],
  ["compare", "compare"],
  ["cascade1", "cascade1"],
  ["cascade2", "cascade2"],
  ["meeting", "meeting"],
  ["pitfalls", "pitfalls"],
  ["worksheet", "worksheet"],
] as const;

const gateKeys = ["bumping", "posting", "grievance", "committee"] as const;
const compareKeys = ["setup", "dates", "clock", "tie", "qualify"] as const;
const cascade1Keys = ["vacancy", "bumper", "displaced", "floor", "log"] as const;
const cascade2Keys = ["roleX", "memberA", "memberB", "memberC", "worksheet"] as const;
const meetingKeys = [
  "open",
  "worksheet",
  "oneChain",
  "vote",
  "minutes",
  "file",
] as const;
const pitfallsKeys = [
  "postingDate",
  "classification",
  "probation",
  "earlierWins",
] as const;
const worksheetKeys = ["columns", "rows", "footer"] as const;

export default async function SeniorityBumpingGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seniorityGuide");
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
            {
              href: "/tools/document-generator?preset=seniority-worksheet",
              label: t("worksheet.exportCta"),
            },
          ]}
        />
      }
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("backToPlaybooks") },
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/guide/grievance-process", label: t("related.grievance") },
        { href: "/guide/dfr", label: t("related.dfr") },
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
      ]}
      footer={
        <SourcesBlock
          pageId="seniority"
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

      <OfficerLearningModuleCallout slug="contract-enforcement" moduleNumber={1} />

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

      <GuideSection
        id="compare"
        title={t("compare.title")}
        intro={t("compare.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {compareKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`compare.items.${key}.label`)}
              content={t(`compare.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("compare.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="cascade1"
        title={t("cascade1.title")}
        intro={t("cascade1.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {cascade1Keys.map((key) => (
            <TipItem
              key={key}
              label={t(`cascade1.items.${key}.label`)}
              content={t(`cascade1.items.${key}.content`)}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="cascade2"
        title={t("cascade2.title")}
        intro={t("cascade2.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {cascade2Keys.map((key) => (
            <TipItem
              key={key}
              label={t(`cascade2.items.${key}.label`)}
              content={t(`cascade2.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout tone="muted" className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("cascade2.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="meeting"
        title={t("meeting.title")}
        intro={t("meeting.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {meetingKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`meeting.items.${key}.label`)}
              content={t(`meeting.items.${key}.content`)}
            />
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("meeting.tip")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="pitfalls"
        title={t("pitfalls.title")}
        intro={t("pitfalls.intro")}
      >
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {pitfallsKeys.map((key) => (
            <TipItem
              key={key}
              label={t(`pitfalls.items.${key}.label`)}
              content={t(`pitfalls.items.${key}.content`)}
            />
          ))}
        </ul>
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
            href="/tools/document-generator?preset=seniority-worksheet"
            className={guideCtaClass}
          >
            {t("worksheet.exportCta")}
          </Link>
        </div>
        <p className="mt-3 text-sm text-gray-700">{t("worksheet.exportHint")}</p>
      </section>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
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
