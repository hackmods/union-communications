import { notFound } from "next/navigation";
import { localizedPublicDocument, PUBLIC_DOCUMENTS } from "@/lib/public-documents/registry";
import { publicDocumentBySlug } from "@/lib/public-documents/database";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import PrivacyPage from "@/app/[locale]/privacy/page";
import SecurityPage from "@/app/[locale]/security/page";
import AccessibilityPage from "@/app/[locale]/accessibility/page";
import { DisplaySettings } from "@/components/accessibility/DisplaySettings";

export const dynamic = "force-dynamic";

export function generateStaticParams() { return PUBLIC_DOCUMENTS.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const published = await publicDocumentBySlug(slug, locale);
  const doc = published && "unpublished" in published ? undefined : published?.document ?? localizedPublicDocument(slug, locale);
  if (!doc) return {};
  return buildPageMetadata({ locale, path: `/documents/${slug}`, title: doc.title, description: doc.summary });
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const published = await publicDocumentBySlug(slug, locale);
  if (published && "unpublished" in published) notFound();
  const doc = published?.document ?? localizedPublicDocument(slug, locale);
  if (!doc) notFound();
  if (published && "payload" in published && published.payload.kind === "policy" && published.payload.content) {
    return <main className="mx-auto max-w-4xl px-5 py-12 md:px-8"><a className="text-sm font-medium text-opseu-blue underline" href={`/${locale}/documents`}>{locale === "fr" ? "← Bibliothèque" : "← Document Library"}</a><h1 className="mt-6 text-4xl font-bold tracking-tight text-opseu-dark">{doc.title}</h1><dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">{[[locale === "fr" ? "Version" : "Version", doc.version], [locale === "fr" ? "En vigueur" : "Effective", doc.effectiveDate ?? (locale === "fr" ? "Non précisée" : "Not supplied")], [locale === "fr" ? "Acceptation requise" : "Acceptance required", doc.requiresAcceptance ? (locale === "fr" ? "Oui pour la version publiée" : "Yes for this published version") : (locale === "fr" ? "Non" : "No")], [locale === "fr" ? "Public" : "Audience", doc.audience], [locale === "fr" ? "Format" : "Format", doc.format], [locale === "fr" ? "Langue" : "Language", doc.language.toUpperCase()], [locale === "fr" ? "Responsable" : "Owner", doc.owner], [locale === "fr" ? "Source" : "Source", doc.source], [locale === "fr" ? "Hébergement" : "Hosting", doc.hosting], [locale === "fr" ? "Mise à jour" : "Currency", doc.currency ?? ""]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd>{value}</dd></div>)}</dl>{slug === "accessibility" ? <section className="mt-8"><DisplaySettings /></section> : null}<article className="prose prose-slate mt-8 max-w-none whitespace-pre-wrap leading-7">{published.payload.content[locale === "fr" ? "fr" : "en"]}</article>{doc.relatedGuide ? <p className="mt-8 text-sm"><a className="text-opseu-blue underline" href={`/${locale}${doc.relatedGuide}`}>{locale === "fr" ? "Guide associé" : "Related guide"}</a></p> : null}<p className="mt-5 text-sm text-gray-600">{locale === "fr" ? `Provenance : ${doc.source}.` : `Provenance: ${doc.source}.`}</p></main>;
  }
  if (["privacy", "security", "accessibility"].includes(slug) && (!published || ("payload" in published && published.payload.kind === "policy" && !published.payload.content))) {
    const policyPage = slug === "privacy" ? await PrivacyPage({ params: Promise.resolve({ locale }) }) : slug === "security" ? await SecurityPage({ params: Promise.resolve({ locale }) }) : await AccessibilityPage({ params: Promise.resolve({ locale }) });
    return <><aside className="mx-auto max-w-4xl px-5 pt-8 text-sm text-gray-600 md:px-8"><a className="text-opseu-blue underline" href={`/${locale}/documents`}>{locale === "fr" ? "← Bibliothèque" : "← Document Library"}</a><dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"><div><dt className="font-semibold">{locale === "fr" ? "Responsable" : "Owner"}</dt><dd>UnionOps</dd></div><div><dt className="font-semibold">{locale === "fr" ? "Version" : "Version"}</dt><dd>{locale === "fr" ? "Version de base migrée" : "Migrated baseline version"}</dd></div><div><dt className="font-semibold">{locale === "fr" ? "Acceptation" : "Acceptance"}</dt><dd>{locale === "fr" ? "Aucune exigence rétroactive" : "No retroactive requirement"}</dd></div></dl></aside>{policyPage}</>;
  }
  const fr = locale === "fr";
  return <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
    <a className="text-sm font-medium text-opseu-blue underline" href={`/${locale}/documents`}>{fr ? "← Bibliothèque" : "← Document Library"}</a>
    <header className="mt-6 border-b border-gray-200 pb-7"><p className="text-sm text-gray-500">{doc.purpose}</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-opseu-dark">{doc.title}</h1><p className="mt-4 text-lg leading-7 text-gray-600">{doc.summary}</p></header>
    <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-3">{[[fr ? "Public" : "Audience", doc.audience], [fr ? "Format" : "Format", doc.format], [fr ? "Langue" : "Language", doc.language.toUpperCase()], [fr ? "Responsable" : "Owner", doc.owner], [fr ? "Source" : "Source", doc.source], [fr ? "Hébergement" : "Hosting", doc.hosting], [fr ? "Version" : "Version", doc.version ?? (fr ? "Non précisée" : "Unspecified")], [fr ? "Date d’entrée en vigueur" : "Effective date", doc.effectiveDate ?? (fr ? "Non précisée" : "Not supplied")], [fr ? "Mise à jour" : "Currency", doc.currency ?? (fr ? "À confirmer auprès de la source" : "Confirm with source")], ...(doc.unionBrand ? [[fr ? "Marque syndicale" : "Union brand", doc.unionBrand]] : [])].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd></div>)}</dl>
    <div className="mt-8 flex flex-wrap gap-3">{doc.externalUrl ? <a className="rounded-lg bg-opseu-blue px-4 py-2 font-semibold text-white" href={`/${locale}/documents/${slug}/open`} rel="noopener noreferrer">{fr ? "Ouvrir la source officielle" : "Open official source"}</a> : <a className="rounded-lg bg-opseu-blue px-4 py-2 font-semibold text-white" href={`/${locale}/documents/${slug}/download`}>{fr ? "Télécharger" : "Download"}</a>}</div>
    {doc.relatedGuide && <p className="mt-8 text-sm text-gray-600">{fr ? "Guide associé : " : "Related guide: "}<a className="text-opseu-blue underline" href={`/${locale}${doc.relatedGuide}`}>{fr ? "Guide pratique des délégués" : "Steward guide"}</a></p>}
    <p className="mt-8 text-sm text-gray-500">{fr ? `Provenance : ${doc.source}.` : `Provenance: ${doc.source}.`}</p>
  </main>;
}
