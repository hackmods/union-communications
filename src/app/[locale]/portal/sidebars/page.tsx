import { setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PortalSidebars } from "@/components/portal/PortalSidebars";

export default async function PortalSidebarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalPage(locale);
  return <PortalSidebars />;
}
