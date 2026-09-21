import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicCatalogExplorer } from "@/components/comms/PublicCatalogExplorer";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { parsePublicCatalogQueryValues } from "@/lib/comms/public-catalog-query";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicCatalog" });
  return buildPageMetadata({
    locale,
    path: "/search",
    title: t("searchTitle"),
    description: t("searchIntro"),
    noIndex: true,
  });
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; audience?: string; topic?: string; format?: string; privacy?: string }>;
}) {
  const { locale } = await params;
  const initialState = parsePublicCatalogQueryValues(await searchParams);
  setRequestLocale(locale);
  return <PublicCatalogExplorer mode="search" initialState={initialState} />;
}
