"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { MfaSetupPageClient } from "./MfaSetupPageClient";

export default function MfaSetupPage() {
  const t = useTranslations("hub");
  return (
    <Suspense
      fallback={
        <PageShell size="nestedAuth" className="py-4 md:py-6">
          <p className="text-gray-600" aria-live="polite">
            {t("sessionLoading")}
          </p>
        </PageShell>
      }
    >
      <MfaSetupPageClient />
    </Suspense>
  );
}
