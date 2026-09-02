import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale } from "next-intl/server";
import { LandAcknowledgementGuide } from "@/components/comms/LandAcknowledgementGuide";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/land-acknowledgement", params);
}

export default async function LandAcknowledgementGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandAcknowledgementGuide />;
}
