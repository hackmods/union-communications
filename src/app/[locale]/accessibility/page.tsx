import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { DisplaySettings } from "@/components/accessibility/DisplaySettings";

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accessibility");

  const features = [
    t("features.semanticHtml"),
    t("features.keyboardNav"),
    t("features.focusIndicators"),
    t("features.contrast"),
    t("features.altText"),
    t("features.reducedMotion"),
    t("features.bilingual"),
    t("features.displaySettings"),
    t("features.skipLink"),
    t("features.altTextTool"),
  ];

  return (
    <GuideLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-6">
        <DisplaySettings />

        <Card>
          <CardTitle>{t("commitment.title")}</CardTitle>
          <p className="mt-3 text-gray-700">{t("commitment.body")}</p>
        </Card>

        <Card>
          <CardTitle>{t("features.title")}</CardTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{t("limitations.title")}</CardTitle>
          <p className="mt-3 text-gray-700">{t("limitations.body")}</p>
        </Card>

        <Card>
          <CardTitle>{t("feedback.title")}</CardTitle>
          <p className="mt-3 text-gray-700">{t("feedback.body")}</p>
        </Card>
      </div>
    </GuideLayout>
  );
}
