import { listPublicDocuments } from "@/lib/public-documents/database";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { DocumentSearchGrid } from "@/components/public/DocumentSearchGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/documents", title: locale === "fr" ? "Bibliothèque de documents" : "Document Library", description: locale === "fr" ? "Documents, modèles et ressources publiques de UnionOps." : "Public UnionOps documents, templates, and linked resources." });
}

export default async function DocumentLibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const fr = locale === "fr";
  const documents = await listPublicDocuments(locale);
  return <main className="mx-auto max-w-6xl px-5 py-12 md:px-8">
    <header className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">{fr ? "UnionOps · Ressources" : "UnionOps · Resources"}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-opseu-dark">{fr ? "Bibliothèque de documents" : "Document Library"}</h1>
      <p className="mt-4 text-lg text-gray-600">{fr ? "Trouvez les politiques, modèles et documents externes par leur utilité, leur public et leur source." : "Find policies, templates, and external resources by purpose, audience, and source."}</p>
    </header>
    <DocumentSearchGrid documents={documents} locale={locale} />
  </main>;
}
