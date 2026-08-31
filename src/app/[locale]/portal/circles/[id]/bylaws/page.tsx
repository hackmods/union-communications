import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PortalCircleBylawsWorkspace } from "@/components/portal/PortalCircleBylawsWorkspace";

export default async function PortalCircleBylawsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePortalPage(locale);
  return (
    <Suspense fallback={<p className="text-gray-600">Loading…</p>}>
      <PortalCircleBylawsWorkspace circleId={id} />
    </Suspense>
  );
}
