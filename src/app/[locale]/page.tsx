import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { HomeContent } from "@/components/pages/HomeContent";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const hubPublic = isOfficerHubPublic();
  return buildPageMetadata({
    locale,
    path: "/",
    title: hubPublic ? t("title") : t("titleCommsOnly"),
    description: hubPublic ? t("description") : t("descriptionCommsOnly"),
    absoluteTitle: true,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}
