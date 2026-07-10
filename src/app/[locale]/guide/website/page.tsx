import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";

const sectionKeys = ["why", "pages", "deploy", "domain"] as const;

export default async function WebsiteGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("websiteGuide");
  const ts = await getTranslations("sources");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>

      <div className="mt-10 space-y-6">
        {sectionKeys.map((key) => (
          <Card key={key}>
            <CardTitle>{t(`sections.${key}.title`)}</CardTitle>
            <p className="mt-3 leading-relaxed text-gray-700">
              {t(`sections.${key}.content`)}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/tools/website-template">
          <Button>{t("toolCta")}</Button>
        </Link>
      </div>

      <SourcesBlock pageId="website" title={ts("title")} intro={ts("intro")} />
    </div>
  );
}
