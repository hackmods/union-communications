import { asc } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { subprocessorPublicProjections } from "@/lib/db/schema";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return buildPublicPageMetadata("/trust/subprocessors", params);
}

type Locale = "en" | "fr";

export default async function PublicSubprocessorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;
  const locale: Locale = requestedLocale === "fr" ? "fr" : "en";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "trustSubprocessorsPage" });
  let records: Array<typeof subprocessorPublicProjections.$inferSelect> = [];
  let available = isPostgresConfigured();
  if (available) {
    try {
      records = await getDb()
        .select()
        .from(subprocessorPublicProjections)
        .orderBy(asc(subprocessorPublicProjections.serviceName));
    } catch {
      available = false;
    }
  }
  function transferLabel(status: string): string {
    if (status === "within_canada") return t("transfer.within_canada");
    if (status === "cross_border") return t("transfer.cross_border");
    if (status === "not_applicable") return t("transfer.not_applicable");
    return t("transfer.under_review");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:py-16">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-opseu-blue">UnionOps · {t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-bold text-opseu-dark lg:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-opseu-gray-dark">{t("intro")}</p>
      </header>
      {!available ? (
        <p role="status" className="rounded-lg border border-opseu-gray/20 bg-white p-5 text-sm text-opseu-gray-dark">{t("unavailable")}</p>
      ) : records.length === 0 ? (
        <p className="rounded-lg border border-opseu-gray/20 bg-white p-5 text-sm text-opseu-gray-dark">{t("empty")}</p>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <article key={record.id} className="rounded-lg border border-opseu-gray/20 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-opseu-dark">{record.serviceName}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("purpose")}</dt><dd className="mt-1 text-sm leading-6 text-opseu-dark">{record.purpose[locale]}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("categories")}</dt><dd className="mt-1 text-sm text-opseu-dark">{record.dataCategories[locale].join(", ")}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("subjects")}</dt><dd className="mt-1 text-sm text-opseu-dark">{record.dataSubjects[locale].join(", ")}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("region")}</dt><dd className="mt-1 text-sm text-opseu-dark">{record.processingRegion}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("transferLabel")}</dt><dd className="mt-1 text-sm text-opseu-dark">{transferLabel(record.transferStatus)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("effective")}</dt><dd className="mt-1 text-sm text-opseu-dark">{new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(record.effectiveFrom)}{record.effectiveTo ? ` — ${new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(record.effectiveTo.getTime() - 24 * 60 * 60 * 1000))}` : ""}</dd></div>
                {record.publicNotes[locale] ? <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("notes")}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-opseu-dark">{record.publicNotes[locale]}</dd></div> : null}
              </dl>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
