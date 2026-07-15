import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";

const checklistKeys = [
  "consent",
  "public",
  "confidential",
  "group",
  "minors",
  "withdrawal",
] as const;

export default async function PhotoConsentGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("photoConsentGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-opseu-blue">
        <Link href="/guide" className="underline">
          {t("backToGuide")}
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
      <p className="mt-4 leading-relaxed text-gray-700">{t("intro")}</p>

      <div className="mt-10 space-y-6">
        <Card>
          <CardTitle>{t("why.title")}</CardTitle>
          <p className="mt-3 leading-relaxed text-gray-700">{t("why.content")}</p>
        </Card>

        <Card>
          <CardTitle>{t("checklist.title")}</CardTitle>
          <p className="mt-3 text-gray-700">{t("checklist.intro")}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {checklistKeys.map((key) => (
              <li key={key}>{t(`checklist.items.${key}`)}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{t("toolbox.title")}</CardTitle>
          <p className="mt-3 leading-relaxed text-gray-700">
            {t("toolbox.content")}
          </p>
        </Card>

        <Card>
          <CardTitle>{t("workshop.title")}</CardTitle>
          <p className="mt-3 leading-relaxed text-gray-700">
            {t("workshop.content")}
          </p>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/tools/graphic-maker">
          <Button variant="outline">{nav("graphicMaker")}</Button>
        </Link>
        <Link href="/privacy">
          <Button variant="outline">{nav("privacy")}</Button>
        </Link>
        <Link href="/guide/resources">
          <Button variant="outline">{nav("resources")}</Button>
        </Link>
      </div>

      <SourcesBlock
        pageId="photoConsent"
        title={ts("title")}
        intro={ts("intro")}
      />
    </div>
  );
}
