"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/layout/PageShell";
import { RouteStatusPanel } from "@/components/layout/RouteStatusPanel";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("routeUi");

  useEffect(() => {
    console.error("[locale]", error.digest ?? error.message);
  }, [error]);

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="section">
      <RouteStatusPanel
        variant="error"
        body={t("errorBody")}
        show243Footnote={false}
        actions={
          <>
            <Button type="button" onClick={reset} className="min-h-11">
              {t("tryAgain")}
            </Button>
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
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
