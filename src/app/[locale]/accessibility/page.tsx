import { setRequestLocale, getTranslations } from "next-intl/server";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
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
      <div className="space-y-8">
        <DisplaySettings />

        <Callout>
          <p className="font-semibold text-opseu-dark">{t("commitment.title")}</p>
          <p className="mt-2 text-gray-700">{t("commitment.body")}</p>
        </Callout>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t("features.title")}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("limitations.title")}</p>
          <p className="mt-2 text-gray-700">{t("limitations.body")}</p>
        </Callout>

        <Callout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("feedback.title")}</p>
          <p className="mt-2 text-gray-700">{t("feedback.body")}</p>
        </Callout>
      </div>
    </GuideLayout>
  );
}
