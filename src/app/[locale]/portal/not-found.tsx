import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { RouteStatusPanel } from "@/components/layout/RouteStatusPanel";

export default async function PortalNotFound() {
  const t = await getTranslations("routeUi");

  return (
    <PageShell size="nestedFocus" className="py-4" as="section">
      <RouteStatusPanel
        variant="notFound"
        bucket="portal"
        body={t("portalNotFoundBody")}
        actions={
          <Link
            href="/portal"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-4 py-2 font-semibold text-white transition-colors hover:bg-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
          >
            {t("backToPortal")}
          </Link>
        }
      />
    </PageShell>
  );
}
