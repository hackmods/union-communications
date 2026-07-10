import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";

const chapterKeys = [
  "platforms",
  "tone",
  "frequency",
  "trolls",
  "accessibility",
] as const;

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guide");
  const nav = await getTranslations("nav");
  const crisis = await getTranslations("crisisGuide");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>

      <Card className="mt-6 border-opseu-blue/20 bg-opseu-blue/5">
        <Link
          href="/guide/social-media-plan"
          className="text-sm font-medium text-opseu-blue underline"
        >
          {t("socialMediaPlanLink")}
        </Link>
      </Card>

      <Card className="mt-6 border-opseu-blue/20 bg-opseu-blue/5">
        <CardTitle>{crisis("title")}</CardTitle>
        <p className="mt-2 text-sm text-gray-700">{crisis("subtitle")}</p>
        <Link
          href="/guide/crisis"
          className="mt-3 inline-block text-sm font-medium text-opseu-blue underline"
        >
          {nav("strikeGuide")} →
        </Link>
      </Card>

      <div className="mt-10 space-y-6">
        {chapterKeys.map((key, i) => (
          <Card key={key}>
            <CardTitle>
              {i + 1}. {t(`chapters.${key}.title`)}
            </CardTitle>
            <p className="mt-3 leading-relaxed text-gray-700">
              {t(`chapters.${key}.content`)}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-10">
        <CardTitle>{t("channelGuides.title")}</CardTitle>
        <ul className="mt-3 space-y-2">
          <li>
            <Link href="/guide/union-boards" className="text-opseu-blue underline">
              {t("channelGuides.unionBoards")}
            </Link>
          </li>
          <li>
            <Link href="/guide/print" className="text-opseu-blue underline">
              {t("channelGuides.print")}
            </Link>
          </li>
          <li>
            <Link href="/guide/website" className="text-opseu-blue underline">
              {t("channelGuides.website")}
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
