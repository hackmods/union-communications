import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";

export default async function LocaleNotFound() {
  const t = await getTranslations("routeUi");

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="section">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-2 text-gray-600">{t("notFoundBody")}</p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
        <Link
          href="/tools"
          className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
        >
          {t("backToTools")}
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
        >
          {t("backHome")}
        </Link>
      </div>
    </PageShell>
  );
}
