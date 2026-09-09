import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { LandAcknowledgementWorksheetButton } from "@/components/comms/LandAcknowledgementWorksheetButton";
import {
  guideCtaClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";
import {
  GuideLayout,
  GuideActionRow,
  GuideOutlineList,
  GuideOutlineStep,
  GuideSection,
  GuideTipGrid,
  GuideTipItem,
  GuideWorkshopNote,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata(
    "/guide/workshops/land-acknowledgement",
    params,
  );
}

const PREP_KEYS = ["who", "materials", "room", "followUp"] as const;
const OUTLINE_KEYS = ["open", "research", "draft", "close"] as const;
const OUTLINE_TOC = [
  ["outline-open", "open"],
  ["outline-research", "research"],
  ["outline-draft", "draft"],
  ["outline-close", "close"],
] as const;
const WRAP_KEYS = ["adopt", "reader", "action", "guide"] as const;

export default async function LandAckWorkshopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landAckWorkshopGuide");
  const nav = await getTranslations("nav");

  const tocItems = guideTocItems(OUTLINE_TOC, (key) =>
    t(`outlineItems.${key}.navLabel`),
  );

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("outlineNavLabel")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/land-acknowledgement", label: nav("landAcknowledgementGuide") },
        { href: "/guide/running-meetings", label: nav("runningMeetingsGuide") },
        { href: "/guide/workshops", label: nav("workshopsHub") },
        { href: "/guide/workshop", label: nav("workshopGuide") },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <GuideWorkshopNote tone="facilitator" label={t("audienceFacilitatorLabel")}>
          {t("audienceFacilitator")}
        </GuideWorkshopNote>
        <GuideWorkshopNote tone="attendee" label={t("audienceAttendeeLabel")}>
          {t("audienceAttendee")}
        </GuideWorkshopNote>
      </div>

      <GuideSection id="prereq" title={t("prereqTitle")} intro={t("prereqIntro")}>
        <GuideTipGrid>
          {PREP_KEYS.map((key) => (
            <GuideTipItem
              key={key}
              label={t(`prereq.${key}.label`)}
              content={t(`prereq.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="outline"
        title={t("outlineTitle")}
        intro={t("outlineIntro")}
      >
        <GuideOutlineList>
          {OUTLINE_KEYS.map((key, index) => (
            <GuideOutlineStep
              key={key}
              id={`outline-${key}`}
              step={index + 1}
              title={t(`outlineItems.${key}.title`)}
              badge={t(`outlineItems.${key}.time`)}
            >
              <GuideWorkshopNote
                className="mt-3"
                tone="attendee"
                label={t("audienceAttendeeLabel")}
              >
                {t(`outlineItems.${key}.do`)}
              </GuideWorkshopNote>
              <GuideWorkshopNote
                className="mt-3"
                tone="facilitator"
                label={t("audienceFacilitatorLabel")}
              >
                {t(`outlineItems.${key}.facilitator`)}
              </GuideWorkshopNote>
            </GuideOutlineStep>
          ))}
        </GuideOutlineList>
      </GuideSection>

      <GuideSection
        id="handout"
        title={t("handoutTitle")}
        intro={t("handoutIntro")}
      >
        <LandAcknowledgementWorksheetButton className="mt-0" />
      </GuideSection>

      <GuideSection id="wrap" title={t("wrapTitle")} intro={t("wrapIntro")}>
        <ol className="list-decimal space-y-3 pl-5 text-gray-700">
          {WRAP_KEYS.map((key) => (
            <li key={key} className="leading-relaxed">
              {t(`wrap.${key}`)}
            </li>
          ))}
        </ol>
        <GuideWorkshopNote
          className="mt-4"
          tone="facilitator"
          label={t("audienceFacilitatorLabel")}
        >
          {t("wrapFacilitator")}
        </GuideWorkshopNote>
      </GuideSection>

      <GuideActionRow className="mt-10">
        <Link href="/guide/land-acknowledgement" className={guideCtaClassSm}>
          {t("guideCta")}
        </Link>
        <Link href="/guide/workshops" className={guideCtaOutlineClassSm}>
          {t("hubCta")}
        </Link>
      </GuideActionRow>
    </GuideLayout>
  );
}
