import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { HomeContent } from "@/components/pages/HomeContent";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}
