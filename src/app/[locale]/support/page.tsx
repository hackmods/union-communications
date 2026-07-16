import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BUY_ME_A_COFFEE_URL } from "@/lib/constants/support";
import { PageShell } from "@/components/layout/PageShell";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "fr" ? "Soutenir UnionOps" : "Support UnionOps";
  const description =
    locale === "fr"
      ? "UnionOps est gratuit et le restera. Des pourboires café optionnels aident à couvrir l'hébergement."
      : "UnionOps is free and always will be. Optional coffee tips help cover hosting and keep the tools going.";
  return buildPageMetadata({
    locale,
    path: "/support",
    title,
    description,
  });
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("supportPage");

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="article">
      <h1 className="text-2xl font-bold leading-tight text-opseu-dark md:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8 max-w-prose space-y-6 text-lg leading-relaxed text-gray-800">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
      </div>

      <p className="mt-10">
        <a
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-opseu-blue px-5 py-3 text-base font-semibold text-white hover:bg-opseu-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opseu-blue"
        >
          {t("cta")}
        </a>
      </p>
      <p className="mt-3 max-w-prose text-sm text-gray-500">{t("ctaHint")}</p>

      <p className="mt-12 flex flex-wrap gap-x-4 gap-y-2 text-base">
        <Link href="/manifesto" className="font-semibold text-opseu-blue hover:underline">
          {t("toManifesto")}
        </Link>
        <Link href="/install" className="font-semibold text-opseu-blue hover:underline">
          {t("toInstall")}
        </Link>
        <Link href="/" className="font-semibold text-opseu-blue hover:underline">
          {t("backHome")}
        </Link>
      </p>
    </PageShell>
  );
}
