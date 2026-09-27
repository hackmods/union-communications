import { LegalDocumentLanding } from "@/components/legal/LegalDocumentLanding";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";

export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return buildPublicPageMetadata("/terms", params, { noIndex: true });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocumentLanding locale={locale} slug="terms" />;
}
