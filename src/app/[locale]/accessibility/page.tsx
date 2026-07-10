import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";
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
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-base text-gray-500">{t("subtitle")}</p>

      <div className="mt-8 space-y-6">
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
    </div>
  );
}
