import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";

const sectionKeys = ["when", "flyers", "boards", "digital"] as const;

export default async function PrintGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("printGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <SourcesBlock pageId="print" title={ts("title")} intro={ts("intro")} />
      }
    >
      <div className="space-y-6">
        {sectionKeys.map((key) => (
          <Card key={key}>
            <CardTitle>{t(`sections.${key}.title`)}</CardTitle>
            <p className="mt-3 leading-relaxed text-gray-700">
              {t(`sections.${key}.content`)}
            </p>
          </Card>
        ))}
      </div>

      <div className="button-row mt-8">
        <Link href="/tools/flyer-maker">
          <Button variant="outline">{nav("flyerMaker")}</Button>
        </Link>
        <Link href="/tools/board-notice">
          <Button variant="outline">{nav("boardNotice")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
