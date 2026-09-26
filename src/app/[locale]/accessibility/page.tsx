import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  GuideBulletList,
  GuideCallout,
  GuideProse,
  GuideSection,
} from "@/components/comms/guide-ui";
import { DisplaySettings } from "@/components/accessibility/DisplaySettings";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

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
    <ComposedPageLayout composition="hub" size="wide" className="py-10 md:py-14">
      <header className="max-w-3xl">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
        <DisplaySettings />
        <GuideCallout measure="fill" className="h-full">
          <h2 className="text-base font-semibold text-opseu-dark">{t("commitment.title")}</h2>
          <GuideProse className="mt-2">{t("commitment.body")}</GuideProse>
        </GuideCallout>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <PublicHubPanel className="h-full">
          <GuideSection
            id="features"
            title={t("features.title")}
            className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
          >
            <GuideBulletList>
              {features.map((feature) => (
                <li key={feature} className="leading-relaxed">
                  {feature}
                </li>
              ))}
            </GuideBulletList>
          </GuideSection>
        </PublicHubPanel>

        <div className="space-y-4">
          <GuideCallout tone="muted" measure="fill">
            <h2 className="text-base font-semibold text-opseu-dark">{t("limitations.title")}</h2>
            <GuideProse className="mt-2">{t("limitations.body")}</GuideProse>
          </GuideCallout>

          <GuideCallout tone="plain" measure="fill">
            <h2 className="text-base font-semibold text-opseu-dark">{t("feedback.title")}</h2>
            <GuideProse className="mt-2">{t("feedback.body")}</GuideProse>
            <p className="mt-3">
              <Link
                href="/feedback?category=accessibility"
                className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("feedback.link")}
              </Link>
            </p>
          </GuideCallout>
        </div>
      </div>
    </ComposedPageLayout>
  );
}
