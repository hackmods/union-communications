"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { RouteStatusPanel } from "@/components/layout/RouteStatusPanel";
import { Button } from "@/components/ui/Button";
import { captureClientRouteError } from "@/lib/observability/capture-client-route-error";

export default function HubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("routeUi");

  useEffect(() => {
    captureClientRouteError(error, "hub");
  }, [error]);

  return (
    <PageShell size="nestedFocus" className="py-4" as="section">
      <RouteStatusPanel
        variant="error"
        body={t("hubErrorBody")}
        show243Footnote={false}
        actions={
          <>
            <Button type="button" onClick={reset} className="min-h-11">
              {t("tryAgain")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              {t("signOut")}
            </Button>
          </>
        }
      />
    </PageShell>
  );
}
