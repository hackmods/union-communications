import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartContent } from "@/components/pages/StartContent";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicCatalog" });
  return buildPageMetadata({
    locale,
    path: "/start",
    title: t("startTitle"),
    description: t("startIntro"),
  });
}

export default async function StartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { locale } = await params;
  const { path } = await searchParams;
  setRequestLocale(locale);
  return <StartContent initialPath={path} />;
}
