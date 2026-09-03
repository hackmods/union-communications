import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ContentReviewCatalog } from "@/components/ops/ContentReviewCatalog";
import { buildContentReviewCatalog } from "@/lib/ops/content-review-catalog";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "buildReview" });
  return buildPageMetadata({
    locale,
    path: "/build/review",
    title: t("metaTitle"),
    description: t("metaDescription"),
    noIndex: true,
  });
}

export default async function BuildReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("buildReview");
  const sections = buildContentReviewCatalog();

  return (
    <PageShell size="wide" className="py-8 md:py-12" as="article">
      <p className="text-sm">
        <Link href="/build" className="text-opseu-blue underline">
          {t("backToBuild")}
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-bold leading-tight text-opseu-dark md:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-prose text-base text-gray-600">{t("description")}</p>
      <p className="mt-2 max-w-prose text-sm text-gray-500">{t("operatorNote")}</p>

      <div className="mt-8">
        <ContentReviewCatalog sections={sections} />
      </div>
    </PageShell>
  );
}
