import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { buildHealthStatus } from "@/lib/ops/health-status";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

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
    <PageShell size="focus" className="py-8 md:py-12" as="article">
      <h1 className="text-2xl font-bold leading-tight text-opseu-dark md:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-prose text-base text-gray-600">{t("description")}</p>

      <dl className="mt-8 max-w-lg space-y-4 rounded-lg border border-gray-200 bg-white p-6 font-mono text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
            <dt className="text-gray-500">{label}</dt>
            <dd className="break-all text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 max-w-prose text-sm text-gray-600">
        <Link href="/build/review" className="text-opseu-blue underline">
          {t("reviewLink")}
        </Link>
      </p>
      <p className="mt-4 max-w-prose text-sm text-gray-600">{t("apiHint")}</p>
    </PageShell>
  );
}
