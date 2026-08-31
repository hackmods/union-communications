"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/layout/PageShell";
import { RouteStatusPanel } from "@/components/layout/RouteStatusPanel";

/** Tool-scoped recovery when preview chunks fail after deploy or offline reload. */
export default function DocumentGeneratorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tRoute = useTranslations("routeUi");
  const t = useTranslations("documentGenerator");

  useEffect(() => {
    console.error("[document-generator]", error.digest ?? error.message);
  }, [error]);

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="section">
      <RouteStatusPanel
        variant="error"
        body={t("loadErrorBody")}
        show243Footnote={false}
        actions={
          <>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11"
            >
              {t("refreshPage")}
            </Button>
            <Button type="button" variant="secondary" onClick={reset} className="min-h-11">
              {tRoute("tryAgain")}
            </Button>
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
            >
              {tRoute("backToTools")}
            </Link>
          </>
        }
      />
    </PageShell>
  );
}
