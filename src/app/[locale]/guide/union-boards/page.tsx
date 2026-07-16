import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import {
  BareMinimumBoardDiagram,
  LayoutReferenceDiagram,
} from "@/components/comms/BoardLayoutDiagrams";
import { BOARD_LAYOUT_REFERENCES } from "@/lib/constants/board-layouts";
import {
  materialsByKind,
} from "@/lib/constants/board-materials";

const practiceKeys = ["where", "howLong", "whatNot", "pairing"] as const;
const printItemKeys = [
  "header",
  "socials",
  "healthSafety",
  "lec",
  "events",
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

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <SourcesBlock pageId="unionBoards" title={ts("title")} intro={ts("intro")} />
      }
    >
      <section aria-labelledby="bare-minimum-heading">
        <h2
          id="bare-minimum-heading"
          className="text-2xl font-bold text-opseu-dark"
        >
          {t("bareMinimum.title")}
        </h2>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("bareMinimum.intro")}
        </p>

        <BareMinimumBoardDiagram labels={zoneLabels} className="mt-6" />

        <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-700">
          {printItemKeys.map((key) => (
            <li key={key}>
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
      </section>

      <section className="mt-12" aria-labelledby="what-to-print-heading">
        <h2
          id="what-to-print-heading"
          className="text-2xl font-bold text-opseu-dark"
        >
          {t("whatToPrint.title")}
        </h2>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("whatToPrint.intro")}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          {(["always", "rotate", "optional", "sizes"] as const).map((key) => (
            <li key={key}>
              <span className="font-semibold text-opseu-dark">
                {t(`whatToPrint.${key}.label`)}:
              </span>{" "}
              {t(`whatToPrint.${key}.content`)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="materials-heading">
        <h2 id="materials-heading" className="text-2xl font-bold text-opseu-dark">
          {t("materials.title")}
        </h2>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("materials.intro")}
        </p>

        <h3 className="mt-6 text-lg font-bold text-opseu-dark">
          {t("materials.ministryHeading")}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{t("materials.ministryNote")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ministry.map((item) => (
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
                  href={item.href}
                  className="font-medium text-opseu-blue underline"
                  {...(item.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : item.href.endsWith(".pdf")
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
          ))}
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
              <a
                href={item.href}
                className="mt-2 inline-block text-sm font-medium text-opseu-blue underline"
                download
              >
                {t("materials.downloadTemplate")}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="layouts-heading">
        <h2 id="layouts-heading" className="text-2xl font-bold text-opseu-dark">
          {t("layouts.title")}
        </h2>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("layouts.intro")}
        </p>

        <h3 className="mt-6 text-lg font-bold text-opseu-dark">
          {t("layouts.photosHeading")}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{t("layouts.photosIntro")}</p>

        <div className="mt-4 space-y-6">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-lg border border-gray-200"
            >
              <Image
                src={photo.href}
                alt={t(`materials.items.${photo.titleKey}Alt`)}
                width={1200}
                height={900}
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
          ))}
        </div>

        <h3 className="mt-10 text-lg font-bold text-opseu-dark">
          {t("layouts.schematicsHeading")}
        </h3>
        <div className="mt-4 space-y-8">
          {BOARD_LAYOUT_REFERENCES.map((layout) => (
            <section
              key={layout.id}
              className="border-l-2 border-opseu-blue/30 pl-5"
            >
              <h4 className="text-lg font-bold text-opseu-dark">
                {t(`layouts.${layout.titleKey}`)}
              </h4>
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
            </section>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="practice-heading">
        <h2
          id="practice-heading"
          className="text-2xl font-bold text-opseu-dark"
        >
          {t("practiceTitle")}
        </h2>
        <div className="mt-6 space-y-8">
          {practiceKeys.map((key) => (
            <section
              key={key}
              className="border-l-2 border-opseu-blue/30 pl-5"
            >
              <h3 className="text-xl font-bold text-opseu-dark">
                {t(`sections.${key}.title`)}
              </h3>
              <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
                {t(`sections.${key}.content`)}
              </p>
            </section>
          ))}
        </div>
      </section>

      <div className="button-row mt-8">
        <Link href="/tools/board-banner">
          <Button>{nav("boardBanner")}</Button>
        </Link>
        <Link href="/tools/board-notice">
          <Button variant="outline">{t("toolCta")}</Button>
        </Link>
        <Link href="/tools/solidarity-poster">
          <Button variant="outline">{nav("solidarityPoster")}</Button>
        </Link>
        <Link href="/tools/qr-card">
          <Button variant="outline">{nav("qrCard")}</Button>
        </Link>
        <Link href="/tools/qr-board">
          <Button variant="outline">{nav("qrBoard")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
