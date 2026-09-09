import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  GuideLayout,
  GuideBulletList,
  GuideCallout,
  GuideProse,
  GuideSection,
} from "@/components/comms/guide-ui";
import { DisplaySettings } from "@/components/accessibility/DisplaySettings";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/accessibility", params);
}

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
    <GuideLayout title={t("title")} subtitle={t("subtitle")} preset="narrow">
      <div className="space-y-10">
        <DisplaySettings />

        <GuideCallout>
          <p className="font-semibold text-opseu-dark">{t("commitment.title")}</p>
          <GuideProse className="mt-2">{t("commitment.body")}</GuideProse>
        </GuideCallout>

        <GuideSection
          id="features"
          title={t("features.title")}
          className="mt-0 not-first-of-type:mt-0"
        >
          <GuideBulletList>
            {features.map((feature) => (
              <li key={feature} className="leading-relaxed">
                {feature}
              </li>
            ))}
          </GuideBulletList>
        </GuideSection>

        <GuideCallout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("limitations.title")}</p>
          <GuideProse className="mt-2">{t("limitations.body")}</GuideProse>
        </GuideCallout>

        <GuideCallout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("feedback.title")}</p>
          <GuideProse className="mt-2">{t("feedback.body")}</GuideProse>
          <p className="mt-3">
            <Link
              href="/feedback?category=accessibility"
              className="font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t("feedback.link")}
            </Link>
          </p>
        </GuideCallout>
      </div>
    </GuideLayout>
  );
}
