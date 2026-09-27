import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PublicDocumentsAdmin } from "@/components/site-admin/PublicDocumentsAdmin";
import { requirePublicDocumentAdmin } from "@/lib/auth/public-document-admin";

export const dynamic = "force-dynamic";

export default async function PublicDocumentsAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const gate = await requirePublicDocumentAdmin();
  if (!gate.ok && (gate.status === 401 || gate.status === 403)) redirect(`/${locale}/app/site-admin`);
  if (!gate.ok) return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold">Public document management is not ready</h1><p className="mt-3 text-gray-700">{gate.error}. Publishing requires verified host MFA, Postgres, and durable shared object storage in production.</p></main>;
  return <PublicDocumentsAdmin />;
}
