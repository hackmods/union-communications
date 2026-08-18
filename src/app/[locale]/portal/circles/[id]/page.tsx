import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { CircleWorkspace } from "@/components/portal/CircleWorkspace";

export default async function PortalCirclePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { roles } = await requirePortalPage(locale);
  return (
    <Suspense fallback={<p className="text-gray-600">Loading…</p>}>
      <CircleWorkspace circleId={id} roles={roles} />
    </Suspense>
  );
}
