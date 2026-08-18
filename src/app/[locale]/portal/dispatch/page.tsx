import { setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PortalDispatch } from "@/components/portal/PortalDispatch";

export default async function PortalDispatchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalPage(locale);
  return <PortalDispatch />;
}
