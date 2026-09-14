import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import {
  GuideLayout,
  GuideActionRow,
  GuideBulletList,
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
  return buildPublicPageMetadata("/guide/membership-signup", params);
}

const TOC = [
  ["why", "why"],
  ["conversation", "conversation"],
  ["paper", "paper"],
  ["digital", "digital"],
  ["privacy", "privacy"],
  ["materials", "materials"],
  ["onboarding", "onboarding"],
  ["checklist", "checklist"],
] as const;

const whyItemKeys = ["density", "vote", "bargain", "comms"] as const;
const conversationItemKeys = ["listen", "connect", "explain", "ask"] as const;
const paperItemKeys = ["legible", "handoff", "storage", "processing"] as const;
const digitalItemKeys = ["urls", "qr", "test", "collection"] as const;
const materialSteps = ["brandKit", "printMaterials", "welcome"] as const;
const onboardingItemKeys = ["welcome", "steward", "broadcast", "confirm"] as const;
const checklistItemKeys = [
  "url",
  "phone",
  "readable",
  "contact",
  "privacy",
  "handoff",
] as const;

export default async function MembershipSignupGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("membershipSignupGuide");
  const nav = await getTranslations("nav");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");
  const labour = await getTranslations("guide");

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
              href: "/tools/qr-board?preset=membershipFtPt",
              label: nav("qrBoard"),
            },
            {
              href: "/tools/qr-card?preset=joinUnion",
              label: nav("qrCard"),
              variant: "outline",
            },
            {
              href: documentGeneratorPresetHref("welcome-letter"),
              label: nav("documentGenerator"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/steward-playbooks", label: t("related.stewardPlaybooks") },
        { href: "/guide/officer-learning", label: t("related.officerLearning") },
        { href: "/brand-kit", label: nav("brandKit") },
        { href: "/tools/qr-board", label: nav("qrBoard") },
        { href: "/tools/qr-card", label: nav("qrCard") },
        { href: "/tools/solidarity-poster", label: nav("solidarityPoster") },
        {
          href: "/tools/document-generator",
          label: nav("documentGenerator"),
        },
        { href: "/guide/print", label: nav("printGuide") },
        { href: "/guide/email-broadcast", label: nav("emailBroadcastGuide") },
        { href: "/guide/union-boards", label: nav("unionBoardsGuide") },
        {
          href: "/guide/workplace-mapping",
          label: labour("labourGuides.workplaceMapping"),
        },
      ]}
      footer={
        <SourcesBlock
          pageId="membershipSignup"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <OfficerLearningModuleCallout slug="membership-lists-privacy" moduleNumber={11} />

      <GuideSection id="why" title={t("why.title")} intro={t("why.intro")}>
        <GuideTipGrid>
          {whyItemKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`why.items.${key}.label`)}
              content={t(`why.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="conversation"
        title={t("conversation.title")}
        intro={t("conversation.intro")}
      >
        <GuideTipGrid>
          {conversationItemKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`conversation.items.${key}.label`)}
              content={t(`conversation.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection id="paper" title={t("paper.title")} intro={t("paper.intro")}>
        <GuideTipGrid>
          {paperItemKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`paper.items.${key}.label`)}
              content={t(`paper.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">
          <Link
            href="/guide/print"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {nav("printGuide")}
          </Link>
        </p>
      </GuideSection>

      <GuideSection
        id="digital"
        title={t("digital.title")}
        intro={t("digital.intro")}
      >
        <GuideTipGrid>
          {digitalItemKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`digital.items.${key}.label`)}
              content={t(`digital.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="mt-1">{t("digital.testTip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="privacy"
        title={t("privacy.title")}
        intro={t("privacy.intro")}
      >
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">
            {t("privacy.employerDriveTitle")}
          </p>
          <p className="mt-1">{t("privacy.employerDriveBody")}</p>
        </GuideCallout>
        <GuideCallout tone="warning" className="mt-4">
          <p className="font-semibold text-amber-950">
            {t("privacy.personalContactTitle")}
          </p>
          <p className="mt-1">{t("privacy.personalContactBody")}</p>
        </GuideCallout>
        <p className="mt-5 max-w-prose leading-relaxed text-gray-700">
          {t("privacy.cases")}
        </p>
      </GuideSection>

      <GuideSection
        id="materials"
        title={t("materials.title")}
        intro={t("materials.intro")}
      >
        <ol className="mt-6 space-y-8">
          {materialSteps.map((key, i) => (
            <li key={key}>
              <div className="flex items-baseline gap-3">
                <span
                  className="text-sm font-bold tabular-nums text-opseu-blue"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-bold text-opseu-dark">
                  {t(`materials.steps.${key}.title`)}
                </h3>
              </div>
              <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
                {t(`materials.steps.${key}.body`)}
              </p>
              {key === "brandKit" ? (
                <div className="mt-4">
                  <Link href="/brand-kit" className={guideCtaClass}>
                    {t("materials.steps.brandKit.cta")}
                  </Link>
                </div>
              ) : null}
              {key === "printMaterials" ? (
                <nav
                  className="mt-4 flex flex-wrap gap-3"
                  aria-label={t("materials.steps.printMaterials.title")}
                >
                  <Link
                    href="/tools/qr-board?preset=membershipFtPt"
                    className={guideCtaOutlineClass}
                  >
                    {t("materials.steps.printMaterials.qrBoard")}
                  </Link>
                  <Link
                    href="/tools/qr-card?preset=joinUnion"
                    className={guideCtaOutlineClass}
                  >
                    {t("materials.steps.printMaterials.qrCard")}
                  </Link>
                  <Link
                    href="/tools/solidarity-poster"
                    className={guideCtaOutlineClass}
                  >
                    {t("materials.steps.printMaterials.poster")}
                  </Link>
                </nav>
              ) : null}
              {key === "welcome" ? (
                <div className="mt-4">
                  <Link
                    href={documentGeneratorPresetHref("welcome-letter")}
                    className={guideCtaOutlineClass}
                  >
                    {t("materials.steps.welcome.cta")}
                  </Link>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection
        id="onboarding"
        title={t("onboarding.title")}
        intro={t("onboarding.intro")}
      >
        <GuideTipGrid>
          {onboardingItemKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`onboarding.items.${key}.label`)}
              content={t(`onboarding.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link
            href={documentGeneratorPresetHref("welcome-letter")}
            className={guideCtaOutlineClass}
          >
            {t("materials.steps.welcome.cta")}
          </Link>
          <Link href="/guide/email-broadcast" className={guideCtaOutlineClass}>
            {nav("emailBroadcastGuide")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <GuideBulletList>
          {checklistItemKeys.map((key) => (
            <li key={key} className="leading-relaxed">
              {t(`checklist.items.${key}`)}
            </li>
          ))}
        </GuideBulletList>
      </GuideSection>

      <GuideActionRow className="mt-10">
        <Link href="/brand-kit" className={guideCtaClass}>
          {nav("brandKit")}
        </Link>
        <Link
          href="/tools/qr-board?preset=membershipFtPt"
          className={guideCtaOutlineClass}
        >
          {nav("qrBoard")}
        </Link>
        <Link
          href="/tools/qr-card?preset=joinUnion"
          className={guideCtaOutlineClass}
        >
          {nav("qrCard")}
        </Link>
        <Link
          href={documentGeneratorPresetHref("welcome-letter")}
          className={guideCtaOutlineClass}
        >
          {nav("documentGenerator")}
        </Link>
      </GuideActionRow>
    </GuideLayout>
  );
}
