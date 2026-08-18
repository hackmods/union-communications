import { setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PortalFronts } from "@/components/portal/PortalFronts";

export default async function PortalFrontsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalPage(locale);
  return <PortalFronts />;
}
