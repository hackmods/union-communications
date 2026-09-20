import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { buildHealthStatus } from "@/lib/ops/health-status";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "buildInfo" });
  return buildPageMetadata({
    locale,
    path: "/build",
    title: t("metaTitle"),
    description: t("metaDescription"),
    noIndex: true,
  });
}

export default async function BuildInfoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("buildInfo");
  const health = buildHealthStatus();

  const rows = [
    { label: t("version"), value: health.version },
    { label: t("commit"), value: health.commit },
    { label: t("builtAt"), value: health.builtAt },
  ] as const;

  return (
    <ComposedPageLayout composition="hub" size="wide" className="py-8 md:py-12">
      <header className="max-w-3xl">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-gray-600">
          {t("description")}
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <PublicHubPanel>
          <dl className="space-y-4 font-mono text-sm">
            {rows.map(({ label, value }) => (
              <div
                key={label}
                className="grid gap-1 border-b border-gray-100 pb-3 last:border-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-4"
              >
                <dt className="text-gray-500">{label}</dt>
                <dd className="break-all text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </PublicHubPanel>

        <PublicHubPanel>
          <p className="text-sm leading-relaxed text-gray-700">
            <Link
              href="/build/review"
              className="font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("reviewLink")}
            </Link>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            {t("apiHint")}
          </p>
        </PublicHubPanel>
      </div>
    </ComposedPageLayout>
  );
}
