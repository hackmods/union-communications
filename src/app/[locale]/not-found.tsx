import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { RouteStatusPanel } from "@/components/layout/RouteStatusPanel";

export default async function LocaleNotFound() {
  const t = await getTranslations("routeUi");

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="section">
      <RouteStatusPanel
        variant="notFound"
        body={t("notFoundBody")}
        actions={
          <>
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-4 py-2 font-semibold text-white transition-colors hover:bg-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
            >
              {t("backToTools")}
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
            >
              {t("backHome")}
            </Link>
          </>
        }
      />
    </PageShell>
  );
}
