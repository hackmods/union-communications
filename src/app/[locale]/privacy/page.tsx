import { permanentRedirect } from "next/navigation";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return buildPublicPageMetadata("/documents/privacy", params);
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/documents/privacy`);
}
