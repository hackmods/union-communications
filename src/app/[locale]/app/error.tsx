"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";

export default function HubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("routeUi");

  useEffect(() => {
    console.error("[hub]", error.digest ?? error.message);
  }, [error]);

  return (
    <PageShell size="nestedFocus" className="py-4" as="section">
      <div role="alert">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("errorTitle")}
        </h1>
        <p className="mt-2 text-gray-600">{t("hubErrorBody")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
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
        </div>
      </div>
    </PageShell>
  );
}
