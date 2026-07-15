import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";

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
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[{ href: "/guide", label: t("backToGuide") }]}
      footer={
        <SourcesBlock
          pageId="photoConsent"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <div className="space-y-6">
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

      <div className="button-row mt-8">
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
    </GuideLayout>
  );
}
