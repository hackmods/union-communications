import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PublicCatalogExplorer } from "@/components/comms/PublicCatalogExplorer";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { parsePublicCatalogQueryValues } from "@/lib/comms/public-catalog-query";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/tools", params);
}

export default async function CreateCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; audience?: string; topic?: string; format?: string; privacy?: string }>;
}) {
  const { locale } = await params;
  const initialState = parsePublicCatalogQueryValues(await searchParams);
  setRequestLocale(locale);
  return <PublicCatalogExplorer mode="create" initialState={initialState} />;
}
