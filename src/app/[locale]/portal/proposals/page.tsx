import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PortalProposals } from "@/components/portal/PortalProposals";

export default async function PortalProposalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tenant, portalEnabled } = await requirePortalPage(locale);
  if (!portalEnabled) return null;
  if (!tenant.union.enabledModules.includes("proposals")) notFound();
  return <PortalProposals />;
}
