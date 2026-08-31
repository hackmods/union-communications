"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { BylawBuilderWorkspace } from "@/components/tools/bylaws/BylawBuilderWorkspace";

export default function BylawBuilderPage() {
  return (
    <Suspense fallback={<BylawBuilderSuspenseFallback />}>
      <BylawBuilderWorkspace />
    </Suspense>
  );
}

function BylawBuilderSuspenseFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}
