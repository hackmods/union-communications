import { permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { hasPublishedContractDocument } from "@/lib/public-documents/contract-routes";
import { publicDocumentBySlug } from "@/lib/public-documents/database";
import { PublicLegalContact } from "@/components/legal/PublicLegalContact";

export type ContractDocumentSlug = "terms" | "dpa";

export async function LegalDocumentLanding({
  locale,
  slug,
}: {
  locale: string;
  slug: ContractDocumentSlug;
}) {
  setRequestLocale(locale);
  const [document, t] = await Promise.all([
    publicDocumentBySlug(slug, locale),
    getTranslations("legalAvailability"),
  ]);

  if (hasPublishedContractDocument(document)) {
    permanentRedirect(`/${locale}/documents/${slug}`);
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
      <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-950">
        {t("status")}
      </p>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-opseu-dark sm:text-4xl">
        {t(`${slug}Title`)}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-opseu-gray-dark">
        {t(`${slug}Unavailable`)}
      </p>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-opseu-gray-dark">
        {t("notAgreement")}
      </p>
      <nav aria-label={t("navigationLabel")} className="mt-7 flex flex-wrap gap-4">
        <Link className="font-semibold text-opseu-blue underline" href="/trust">
          {t("trustLink")}
        </Link>
        <Link className="font-semibold text-opseu-blue underline" href="/documents">
          {t("documentsLink")}
        </Link>
      </nav>
      <PublicLegalContact role="privacy" />
    </main>
  );
}
