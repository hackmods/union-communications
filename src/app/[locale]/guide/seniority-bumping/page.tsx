import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { guideCtaClass } from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import {
  GuideLayout,
  GuideActionRow,
  GuideCallout,
  GuideSection,
  GuideTipGrid,
  GuideTipItem,
} from "@/components/comms/guide-ui";

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
              href: documentGeneratorPresetHref("seniority-worksheet"),
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
      <GuideCallout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </GuideCallout>

      <OfficerLearningModuleCallout slug="seniority-bumping-layoff" moduleNumber={16} />

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
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("gate.warningTitle")}</p>
          <p className="mt-1">{t("gate.warning")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="compare"
        title={t("compare.title")}
        intro={t("compare.intro")}
      >
        <GuideTipGrid className="mt-4">
          {compareKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`compare.items.${key}.label`)}
              content={t(`compare.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("compare.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="cascade1"
        title={t("cascade1.title")}
        intro={t("cascade1.intro")}
      >
        <GuideTipGrid className="mt-4">
          {cascade1Keys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`cascade1.items.${key}.label`)}
              content={t(`cascade1.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="cascade2"
        title={t("cascade2.title")}
        intro={t("cascade2.intro")}
      >
        <GuideTipGrid className="mt-4">
          {cascade2Keys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`cascade2.items.${key}.label`)}
              content={t(`cascade2.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="muted" className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("cascade2.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="meeting"
        title={t("meeting.title")}
        intro={t("meeting.intro")}
      >
        <GuideTipGrid className="mt-4">
          {meetingKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`meeting.items.${key}.label`)}
              content={t(`meeting.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("meeting.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="pitfalls"
        title={t("pitfalls.title")}
        intro={t("pitfalls.intro")}
      >
        <GuideTipGrid className="mt-4">
          {pitfallsKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`pitfalls.items.${key}.label`)}
              content={t(`pitfalls.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="worksheet"
        title={t("worksheet.title")}
        intro={t("worksheet.intro")}
      >
        <GuideTipGrid className="mt-4">
          {worksheetKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`worksheet.items.${key}.label`)}
              content={t(`worksheet.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link
            href={documentGeneratorPresetHref("seniority-worksheet")}
            className={guideCtaClass}
          >
            {t("worksheet.exportCta")}
          </Link>
        </GuideActionRow>
        <p className="mt-3 text-sm text-gray-700">{t("worksheet.exportHint")}</p>
      </GuideSection>

      <GuideCallout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
      </GuideCallout>
    </GuideLayout>
  );
}


