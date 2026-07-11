import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import {
  BareMinimumBoardDiagram,
  LayoutReferenceDiagram,
} from "@/components/comms/BoardLayoutDiagrams";
import { BOARD_LAYOUT_REFERENCES } from "@/lib/constants/board-layouts";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>

      {/* Bare minimum */}
      <section className="mt-10" aria-labelledby="bare-minimum-heading">
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

        <p className="mt-4 text-sm text-gray-600">{t("bareMinimum.tip")}</p>
      </section>

      {/* What to print */}
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
          {(
            ["always", "rotate", "optional", "sizes"] as const
          ).map((key) => (
            <li key={key}>
              <span className="font-semibold text-opseu-dark">
                {t(`whatToPrint.${key}.label`)}:
              </span>{" "}
              {t(`whatToPrint.${key}.content`)}
            </li>
          ))}
        </ul>
      </section>

      {/* Reference layouts from IRL locals */}
      <section className="mt-12" aria-labelledby="layouts-heading">
        <h2 id="layouts-heading" className="text-2xl font-bold text-opseu-dark">
          {t("layouts.title")}
        </h2>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("layouts.intro")}
        </p>

        <div className="mt-6 space-y-6">
          {BOARD_LAYOUT_REFERENCES.map((layout) => (
            <Card key={layout.id}>
              <CardTitle>{t(`layouts.${layout.titleKey}`)}</CardTitle>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
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
            </Card>
          ))}
        </div>
      </section>

      {/* Practice tips */}
      <section className="mt-12" aria-labelledby="practice-heading">
        <h2
          id="practice-heading"
          className="text-2xl font-bold text-opseu-dark"
        >
          {t("practiceTitle")}
        </h2>
        <div className="mt-6 space-y-6">
          {practiceKeys.map((key) => (
            <Card key={key}>
              <CardTitle>{t(`sections.${key}.title`)}</CardTitle>
              <p className="mt-3 leading-relaxed text-gray-700">
                {t(`sections.${key}.content`)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/tools/board-notice">
          <Button>{t("toolCta")}</Button>
        </Link>
        <Link href="/tools/solidarity-poster">
          <Button variant="outline">{nav("solidarityPoster")}</Button>
        </Link>
      </div>

      <SourcesBlock pageId="unionBoards" title={ts("title")} intro={ts("intro")} />
    </div>
  );
}
