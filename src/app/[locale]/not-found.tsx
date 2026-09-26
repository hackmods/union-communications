import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { RouteStatusPanel } from "@/components/layout/RouteStatusPanel";

const actionLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

export default async function LocaleNotFound() {
  const t = await getTranslations("routeUi");
  const nav = await getTranslations("nav");

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="section">
      <RouteStatusPanel
        variant="notFound"
        body={t("notFoundBody")}
        actions={
          <>
            <Link
              href="/create"
              className={`${actionLinkClass} bg-opseu-blue text-white hover:bg-opseu-dark`}
            >
              {nav("create")}
            </Link>
            <Link
              href="/utilities"
              className={`${actionLinkClass} border-2 border-opseu-blue text-opseu-blue hover:bg-opseu-blue/5`}
            >
              {nav("utilities")}
            </Link>
            <Link
              href="/learn"
              className={`${actionLinkClass} text-opseu-blue underline-offset-2 hover:underline`}
            >
              {nav("learn")}
            </Link>
            <Link
              href="/"
              className={`${actionLinkClass} text-opseu-blue underline-offset-2 hover:underline`}
            >
              {t("backHome")}
            </Link>
            <Link
              href="/feedback?category=issue"
              className={`${actionLinkClass} text-opseu-blue underline-offset-2 hover:underline`}
            >
              {t("tellUsMissing")}
            </Link>
          </>
        }
      />
    </PageShell>
  );
}
