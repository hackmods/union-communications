import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";
import { OfficerLearningDashboard } from "@/components/officer-learning/OfficerLearningDashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/officer-learning", params);
}

export default async function OfficerLearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OfficerLearningDashboard modules={OFFICER_LEARNING_MODULES} />;
}
