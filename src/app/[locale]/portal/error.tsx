"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/layout/PageShell";
import { RouteStatusPanel } from "@/components/layout/RouteStatusPanel";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("routeUi");

  useEffect(() => {
    console.error("[portal]", error.digest ?? error.message);
  }, [error]);

  return (
    <PageShell size="nestedFocus" className="py-4" as="section">
      <RouteStatusPanel
        variant="error"
        body={t("portalErrorBody")}
        show243Footnote={false}
        actions={
          <>
            <Button type="button" onClick={reset} className="min-h-11">
              {t("tryAgain")}
            </Button>
            <Link
              href="/portal"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
            >
              {t("backToPortal")}
            </Link>
          </>
        }
      />
    </PageShell>
  );
}
