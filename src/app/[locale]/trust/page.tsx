import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return buildPublicPageMetadata("/trust", params);
}

export default async function TrustPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trustPage");

  const links = [
    { href: "/documents/privacy", label: t("privacy") },
    { href: "/documents/security", label: t("security") },
    { href: "/documents/accessibility", label: t("accessibility") },
    { href: "/trust/subprocessors", label: t("subprocessors") },
  ] as const;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-16">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-opseu-blue">
          UnionOps · {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-opseu-dark sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-opseu-gray-dark">
          {t("intro")}
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-opseu-gray/20 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-opseu-dark">{t("hostingTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-opseu-gray-dark">
          {t("hostingBody")}
        </p>
      </section>

      <nav aria-label={t("documentsLabel")} className="mt-8">
        <h2 className="text-xl font-semibold text-opseu-dark">{t("documentsTitle")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-14 items-center justify-between rounded-xl border border-opseu-gray/20 bg-white px-5 py-4 font-semibold text-opseu-blue underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opseu-blue"
              >
                {label}<span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-8 max-w-3xl text-sm leading-6 text-opseu-gray-dark">
        {t("scopeNote")}
      </p>
    </main>
  );
}
