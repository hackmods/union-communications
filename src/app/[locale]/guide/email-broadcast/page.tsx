import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { guideCtaOutlineClass } from "@/components/comms/guideCtaClasses";
import {
  GuideLayout,
  GuideActionRow,
  GuideBulletList,
  GuideCallout,
  GuideProse,
  GuideSection,
  GuideTipGrid,
  GuideTipItem,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/email-broadcast", params);
}

const TOC = [
  ["when", "when"],
  ["anatomy", "anatomy"],
  ["protect", "protect"],
  ["toolkit", "toolkit"],
  ["checklist", "checklist"],
] as const;

const whenItemKeys = ["meeting", "rsvp", "vote", "bargaining"] as const;
const anatomyItemKeys = ["subject", "facts", "ask", "local"] as const;
const checklistItemKeys = [
  "subject",
  "facts",
  "ask",
  "local",
  "bcc",
  "personal",
  "rsvp",
  "cases",
] as const;

export default async function EmailBroadcastGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("emailBroadcastGuide");
  const nav = await getTranslations("nav");
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
            { href: "/create/document-generator", label: nav("documentGenerator") },
            {
              href: "/create/board-notice",
              label: nav("boardNotice"),
              variant: "outline",
            },
            {
              href: "/create/flyer-maker",
              label: nav("flyerMaker"),
              variant: "outline",
            },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/learn/print", label: nav("printGuide") },
        { href: "/learn/website", label: nav("websiteGuide") },
        { href: "/learn/first-week", label: nav("socialMediaPlan") },
        { href: "/create/document-generator", label: nav("documentGenerator") },
        { href: "/create/flyer-maker", label: nav("flyerMaker") },
        { href: "/learn/crisis", label: nav("crisisCommsGuide") },
      ]}
      footer={
        <SourcesBlock
          pageId="emailBroadcast"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <GuideSection id="when" title={t("when.title")} intro={t("when.intro")}>
        <GuideTipGrid>
          {whenItemKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`when.items.${key}.label`)}
              content={t(`when.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("when.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="anatomy"
        title={t("anatomy.title")}
        intro={t("anatomy.intro")}
      >
        <GuideTipGrid>
          {anatomyItemKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`anatomy.items.${key}.label`)}
              content={t(`anatomy.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="protect"
        title={t("protect.title")}
        intro={t("protect.intro")}
      >
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("protect.bccTitle")}</p>
          <p className="mt-1">{t("protect.bccBody")}</p>
        </GuideCallout>
        <GuideCallout tone="warning" className="mt-4">
          <p className="font-semibold text-amber-950">
            {t("protect.employerTitle")}
          </p>
          <p className="mt-1">{t("protect.employerBody")}</p>
        </GuideCallout>
        <GuideProse className="mt-5">{t("protect.cases")}</GuideProse>
      </GuideSection>

      <GuideSection
        id="toolkit"
        title={t("toolkit.title")}
        intro={t("toolkit.intro")}
      >
        <GuideProse className="mt-3">{t("toolkit.tools")}</GuideProse>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">
            {t("toolkit.privacyTitle")}
          </p>
          <p className="mt-1">{t("toolkit.privacyBody")}</p>
        </GuideCallout>
        <GuideCallout tone="muted" className="mt-4">
          <p className="font-semibold text-opseu-dark">{t("toolkit.hubTitle")}</p>
          <p className="mt-1">{t("toolkit.hubBody")}</p>
        </GuideCallout>
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
        <Link href="/create/document-generator" className={guideCtaOutlineClass}>
          {nav("documentGenerator")}
        </Link>
        <Link href="/create/board-notice" className={guideCtaOutlineClass}>
          {nav("boardNotice")}
        </Link>
        <Link href="/create/flyer-maker" className={guideCtaOutlineClass}>
          {nav("flyerMaker")}
        </Link>
      </GuideActionRow>
    </GuideLayout>
  );
}
