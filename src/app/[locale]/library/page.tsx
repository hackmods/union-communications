import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/guide-ui";
import { PublicCatalogBreadcrumbs } from "@/components/comms/PublicCatalogBreadcrumbs";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildPublicPageMetadata("/learn/library", params);
}

const LINKS = [
  { href: "/learn/library/examples" as const, titleKey: "socialExamples" as const, bodyKey: "examplesSummary" as const },
  { href: "/learn/library/captions" as const, titleKey: "captions" as const, bodyKey: "captionsSummary" as const },
  { href: "/learn/library/brand-assets" as const, titleKey: "assets" as const, bodyKey: "assetsSummary" as const },
];

export default async function LibraryHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("publicCatalog");
  const nav = await getTranslations("nav");
  return (
    <>
      <PublicCatalogBreadcrumbs />
      <GuideLayout preset="hub" title={t("libraryHubTitle")} intro={t("libraryHubDescription")}>
        <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((row) => (
            <li key={row.href} className="min-w-0">
              <Link
                href={row.href}
                className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-opseu-blue/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
              >
                <span className="block text-lg font-bold text-opseu-dark">
                  {nav(row.titleKey)}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-slate-600">
                  {t(row.bodyKey)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </GuideLayout>
    </>
  );
}
