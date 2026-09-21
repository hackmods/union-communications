import { setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PortalMyCases } from "@/components/portal/PortalMyCases";

export default async function MyCasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalPage(locale);
  return <PortalMyCases />;
}
