import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";

/**
 * FUTURE-006 — placeholder member-facing poll route.
 * Response collection is blocked on SEC-003; authoring ships without intake.
 */
export default async function PollPlaceholderPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pollPlaceholder");

  return (
    <PageShell>
      <article className="mx-auto max-w-lg space-y-4 py-10">
        <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
        <p className="text-gray-700">{t("body")}</p>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {t("privacy")}
        </p>
        <p className="text-xs text-gray-500">
          {t("slugLabel")}: {slug}
        </p>
      </article>
    </PageShell>
  );
}
