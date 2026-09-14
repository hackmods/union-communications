"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";

/**
 * Shared Suspense fallback for canvas tool pages (flyer-maker pattern).
 * Prevents an unstyled flash before Brand Kit / form state hydrates.
 */
export function ToolLoadingFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}