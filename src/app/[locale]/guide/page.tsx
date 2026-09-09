import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import {
  GUIDE_BLUEPRINT_PATH_LINKS,
  GUIDE_REGISTRY,
  GUIDE_STEWARD_PLAYBOOKS_HUB,
  stewardDiscoverabilityLinks,
} from "@/lib/comms/guide-registry";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import {
  GuideLayout,
  GuideActionRow,
  GuideCallout,
  GuideLinkCluster,
  GuideLinkList,
  GuideSection,
  GuideSpotlightBand,
  GuideTipGrid,
  GuideTipItem,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide", params);
}

const TOC = [
  ["startHere", "startHere"],
  ["channels", "channels"],
  ["platforms", "platforms"],
  ["tone", "tone"],
  ["frequency", "frequency"],
  ["trolls", "trolls"],
  ["accessibility", "accessibility"],
  ["fullWeek", "fullWeek"],
] as const;

const startKeys = ["brand", "firstWeek", "resources", "officers"] as const;
const channelKeys = ["social", "print", "boards", "web"] as const;
const platformKeys = ["facebook", "instagram", "website", "startOne"] as const;
const toneKeys = ["we", "honest", "plain", "crisis"] as const;
const frequencyKeys = ["normal", "mix", "strike", "quiet"] as const;
const trollKeys = ["spam", "management", "pin", "never"] as const;
const a11yKeys = ["alt", "contrast", "captions", "mobile"] as const;
const weekKeys = ["mon", "wed", "thu", "fri"] as const;

const pathLinks = GUIDE_BLUEPRINT_PATH_LINKS;

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guide");
  const nav = await getTranslations("nav");
  const strike = await getTranslations("strikeOpsGuide");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(TOC, (key) => t(`${key}.navLabel`));

  return (
    <GuideLayout
      preset="hub"
      composition="sidebar-left"
      size="wide"
      toc={tocItems}
      tocLabel={t("tocLabel")}
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("path.title")}
      relatedLinks={pathLinks.map(({ href, key }) => ({
        href,
        label: t(`path.${key}`),
      }))}
      footer={
        <SourcesBlock pageId="blueprint" title={ts("title")} intro={ts("intro")} />
      }
    >
      <GuideSpotlightBand
        className="mt-0 mb-10"
        kicker={strike("title")}
        lead={strike("subtitle")}
      >
        <GuideActionRow className="mt-0">
          <Link href="/guide/strike" className={guideCtaClass}>
            {nav("strikeOpsGuide")}
          </Link>
          <Link href="/guide/crisis" className={guideCtaOutlineClass}>
            {nav("crisisCommsGuide")}
          </Link>
        </GuideActionRow>
      </GuideSpotlightBand>

      <GuideSection
        id="startHere"
        title={t("startHere.title")}
        intro={t("startHere.intro")}
      >
        <GuideTipGrid className="mt-4">
          {startKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`startHere.items.${key}.label`)}
              content={t(`startHere.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("startHere.tip")}</p>
        </GuideCallout>
        <GuideActionRow>
          <Link href="/brand-kit" className={guideCtaOutlineClass}>
            {nav("brandKit")}
          </Link>
          <Link href="/guide/social-media-plan" className={guideCtaOutlineClass}>
            {nav("socialMediaPlan")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection id="channels" title={t("channels.title")} intro={t("channels.intro")}>
        <GuideTipGrid className="mt-4">
          {channelKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`channels.items.${key}.label`)}
              content={t(`channels.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">
            {t("channels.warningTitle")}
          </p>
          <p className="mt-1">{t("channels.warning")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="platforms"
        title={t("platforms.title")}
        intro={t("platforms.intro")}
      >
        <GuideTipGrid className="mt-4">
          {platformKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`platforms.items.${key}.label`)}
              content={t(`platforms.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("platforms.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="tone" title={t("tone.title")} intro={t("tone.intro")}>
        <GuideTipGrid className="mt-4">
          {toneKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`tone.items.${key}.label`)}
              content={t(`tone.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="frequency"
        title={t("frequency.title")}
        intro={t("frequency.intro")}
      >
        <GuideTipGrid className="mt-4">
          {frequencyKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`frequency.items.${key}.label`)}
              content={t(`frequency.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="muted" className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("frequency.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection id="trolls" title={t("trolls.title")} intro={t("trolls.intro")}>
        <GuideTipGrid className="mt-4">
          {trollKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`trolls.items.${key}.label`)}
              content={t(`trolls.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout tone="warning" className="mt-5">
          <p className="font-semibold text-amber-950">{t("trolls.warningTitle")}</p>
          <p className="mt-1">{t("trolls.warning")}</p>
        </GuideCallout>
      </GuideSection>

      <GuideSection
        id="accessibility"
        title={t("accessibility.title")}
        intro={t("accessibility.intro")}
      >
        <GuideTipGrid className="mt-4">
          {a11yKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`accessibility.items.${key}.label`)}
              content={t(`accessibility.items.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideActionRow>
          <Link href="/tools/alt-text" className={guideCtaOutlineClass}>
            {nav("altText")}
          </Link>
        </GuideActionRow>
      </GuideSection>

      <GuideSection
        id="fullWeek"
        title={t("fullWeek.title")}
        intro={t("fullWeek.intro")}
      >
        <GuideTipGrid className="mt-4" as="ol">
          {weekKeys.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`fullWeek.phases.${key}.label`)}
              content={t(`fullWeek.phases.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
        <GuideCallout className="mt-5">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("fullWeek.tip")}</p>
        </GuideCallout>
      </GuideSection>

      <ul className="mt-10 grid list-none gap-8 p-0 sm:grid-cols-2">
        <GuideLinkCluster title={t("bargainingGuides.title")}>
          <GuideLinkList
            links={GUIDE_REGISTRY.bargaining.map((link) => ({
              href: link.href,
              label: t(`bargainingGuides.${link.key}`),
            }))}
          />
        </GuideLinkCluster>

        <GuideLinkCluster title={t("channelGuides.title")}>
          <GuideLinkList
            links={GUIDE_REGISTRY.channels.map((link) => ({
              href: link.href,
              label: t(`channelGuides.${link.key}`),
            }))}
          />
        </GuideLinkCluster>

        <GuideLinkCluster
          className="sm:col-span-2"
          title={t("labourGuides.title")}
          headerAction={
            <Link
              href="/guide/steward-playbooks"
              className="text-sm font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("labourGuides.seeAll")} →
            </Link>
          }
        >
          <GuideLinkList
            links={stewardDiscoverabilityLinks()
              .filter((link) => link.href !== GUIDE_STEWARD_PLAYBOOKS_HUB)
              .map((link) => ({
                href: link.href,
                label: t(`labourGuides.${link.key}`),
              }))}
          />
        </GuideLinkCluster>
      </ul>
    </GuideLayout>
  );
}


