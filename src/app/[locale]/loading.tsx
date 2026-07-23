import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function LocaleLoading() {
  const t = await getTranslations("routeUi");

  return (
    <PageShell size="wide" className="py-8 md:py-12">
      <div role="status" aria-busy="true" className="space-y-6">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-3/4 max-w-lg" />
        <Skeleton className="mt-8 h-40 w-full" />
      </div>
    </PageShell>
  );
}
