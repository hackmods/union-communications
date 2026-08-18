import { setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PortalStation } from "@/components/portal/PortalStation";

export default async function PortalStationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { roles } = await requirePortalPage(locale);
  return <PortalStation roles={roles} />;
}
