import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import {
  GuideLayout,
  GuideSection,
  GuideAccentBlock,
  GuideTipGrid,
  GuideTipItem,
  GuideActionRow,
  GuideWideFigure,
} from "@/components/comms/guide-ui";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import {
  BareMinimumBoardDiagram,
  LayoutReferenceDiagram,
} from "@/components/comms/BoardLayoutDiagrams";
import { BOARD_LAYOUT_REFERENCES } from "@/lib/constants/board-layouts";
import {
  materialsByKind,
} from "@/lib/constants/board-materials";
import { BoardReferenceSheetButton } from "@/components/comms/BoardReferenceSheetButton";
import { SpreadsheetXlsxButton } from "@/components/comms/SpreadsheetXlsxButton";
import { OfficerLearningModuleCallout } from "@/components/officer-learning/OfficerLearningModuleCallout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/union-boards", params);
}

const practiceKeys = ["where", "howLong", "whatNot", "pairing"] as const;
const printItemKeys = [
  "header",
  "socials",
  "healthSafety",
  "lec",
  "events",
] as const;

const TOC = [
  ["bare-minimum", "bareMinimum"],
  ["what-to-print", "whatToPrint"],
  ["materials", "materials"],
  ["layouts", "layouts"],
  ["practice", "practice"],
] as const;

export default async function UnionBoardsGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("unionBoardsGuide");
  const nav = await getTranslations("nav");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");

  const zoneLabels = {
    header: t("zones.header"),
    socials: t("zones.socials"),
    healthSafety: t("zones.healthSafety"),
    lec: t("zones.lec"),
    events: t("zones.events"),
    filler: t("zones.filler"),
  };

  const ministry = [
    ...materialsByKind("ministryPoster"),
    ...materialsByKind("ministryLink"),
  ];
  const templates = materialsByKind("localTemplate");
  const photos = materialsByKind("examplePhoto");

  const tocItems = guideTocItems(TOC, (key) => t(`${key}.navLabel`));

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("tocLabel")}
      aside={
        <GuideToolAside
          title={tg("asideTitle")}
          intro={tg("asideIntro")}
          links={[
            { href: "/tools/board-notice", label: t("toolCta") },
            {
              href: "/tools/board-banner",
              label: nav("boardBanner"),
              variant: "outline",
            },
          ]}
        />
      }
      footer={
        <SourcesBlock pageId="unionBoards" title={ts("title")} intro={ts("intro")} />
      }
    >
      <OfficerLearningModuleCallout slug="financial-health" moduleNumber={5} />

      <GuideSection
        id="bare-minimum"
        title={t("bareMinimum.title")}
        intro={t("bareMinimum.intro")}
      >
        <GuideWideFigure>
          <BareMinimumBoardDiagram labels={zoneLabels} />
        </GuideWideFigure>

        <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-700 sm:columns-2 sm:gap-x-8">
          {printItemKeys.map((key) => (
            <li key={key} className="break-inside-avoid">
              <p className="font-semibold text-opseu-dark">
                {t(`bareMinimum.items.${key}.title`)}
              </p>
              <p className="mt-1 leading-relaxed">
                {t(`bareMinimum.items.${key}.content`)}
              </p>
            </li>
          ))}
        </ol>

        <Callout tone="muted" className="mt-4">
          {t("bareMinimum.tip")}
        </Callout>
      </GuideSection>

      <GuideSection
        id="what-to-print"
        title={t("whatToPrint.title")}
        intro={t("whatToPrint.intro")}
      >
        <GuideTipGrid>
          {(["always", "rotate", "optional", "sizes"] as const).map((key) => (
            <GuideTipItem
              key={key}
              label={t(`whatToPrint.${key}.label`)}
              content={t(`whatToPrint.${key}.content`)}
            />
          ))}
        </GuideTipGrid>
      </GuideSection>

      <GuideSection
        id="materials"
        title={t("materials.title")}
        intro={t("materials.intro")}
      >
        <h3 className="text-lg font-bold text-opseu-dark">
          {t("materials.ministryHeading")}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{t("materials.ministryNote")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ministry.map((item) => {
            const href = item.href;
            if (!href) return null;
            return (
            <li
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <p className="font-semibold text-opseu-dark">
                {t(`materials.items.${item.titleKey}`)}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {t(`materials.items.${item.descriptionKey}`)}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <a
                  href={href}
                  className="font-medium text-opseu-blue underline"
                  {...(href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : href.endsWith(".pdf")
                      ? { download: true }
                      : {})}
                >
                  {item.kind === "ministryPoster"
                    ? t("materials.downloadPdf")
                    : t("materials.openLink")}
                </a>
                {item.officialUrl ? (
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 underline"
                  >
                    {t("materials.officialSource")}
                  </a>
                ) : null}
              </div>
            </li>
            );
          })}
        </ul>

        <h3 className="mt-8 text-lg font-bold text-opseu-dark">
          {t("materials.templatesHeading")}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{t("materials.templatesNote")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {templates.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <p className="font-semibold text-opseu-dark">
                {t(`materials.items.${item.titleKey}`)}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {t(`materials.items.${item.descriptionKey}`)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {item.pdfReference ? (
                  <BoardReferenceSheetButton kind={item.pdfReference} />
                ) : item.href ? (
                  <>
                    <a
                      href={item.href}
                      className="font-medium text-opseu-blue underline"
                      download
                    >
                      {t("materials.downloadTemplate")}
                    </a>
                    {item.offerXlsx ? (
                      <SpreadsheetXlsxButton
                        csvHref={item.href}
                        downloadBasename={
                          item.href.split("/").pop() ?? "sample.csv"
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="layouts"
        title={t("layouts.title")}
        intro={t("layouts.intro")}
      >
        <h3 className="text-lg font-bold text-opseu-dark">
          {t("layouts.photosHeading")}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{t("layouts.photosIntro")}</p>

        <div className="mt-4 space-y-6">
          {photos.map((photo, index) => {
            const src = photo.href;
            if (!src) return null;
            return (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-lg border border-gray-200"
            >
              <Image
                src={src}
                alt={t(`materials.items.${photo.titleKey}Alt`)}
                width={1200}
                height={900}
                sizes="(max-width: 768px) 100vw, 768px"
                loading={index === 0 ? "eager" : "lazy"}
                className="h-auto w-full object-cover"
              />
              <figcaption className="bg-gray-50 px-4 py-3">
                <p className="font-semibold text-opseu-dark">
                  {t(`materials.items.${photo.titleKey}`)}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {t(`materials.items.${photo.descriptionKey}`)}
                </p>
              </figcaption>
            </figure>
            );
          })}
        </div>

        <h3 className="mt-10 text-lg font-bold text-opseu-dark">
          {t("layouts.schematicsHeading")}
        </h3>
        <div className="mt-4 space-y-8">
          {BOARD_LAYOUT_REFERENCES.map((layout) => (
            <GuideAccentBlock
              key={layout.id}
              titleAs="h4"
              title={t(`layouts.${layout.titleKey}`)}
            >
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-700">
                {t(`layouts.${layout.descriptionKey}`)}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-opseu-blue">
                {t(`layouts.${layout.bestForKey}`)}
              </p>
              <LayoutReferenceDiagram
                areas={[...layout.areas]}
                zones={[...layout.zones]}
                labels={zoneLabels}
                className="mt-4"
              />
            </GuideAccentBlock>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="practice" title={t("practiceTitle")}>
        <div className="space-y-8">
          {practiceKeys.map((key) => (
            <GuideAccentBlock
              key={key}
              title={t(`sections.${key}.title`)}
            >
              <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
                {t(`sections.${key}.content`)}
              </p>
            </GuideAccentBlock>
          ))}
        </div>
      </GuideSection>

      <GuideActionRow className="mt-8">
        <Link href="/tools/board-banner" className={guideCtaClass}>
          {nav("boardBanner")}
        </Link>
        <Link href="/tools/board-notice" className={guideCtaOutlineClass}>
          {t("toolCta")}
        </Link>
        <Link href="/tools/solidarity-poster" className={guideCtaOutlineClass}>
          {nav("solidarityPoster")}
        </Link>
        <Link href="/tools/org-chart" className={guideCtaOutlineClass}>
          {nav("orgChart")}
        </Link>
        <Link href="/tools/qr-card" className={guideCtaOutlineClass}>
          {nav("qrCard")}
        </Link>
        <Link href="/tools/qr-board" className={guideCtaOutlineClass}>
          {nav("qrBoard")}
        </Link>
        <Link href="/guide/membership-signup" className={guideCtaOutlineClass}>
          {nav("membershipSignupGuide")}
        </Link>
      </GuideActionRow>
    </GuideLayout>
  );
}
