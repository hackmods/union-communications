import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessPortal } from "@/lib/portal/access";
import { PortalSidebars } from "@/components/portal/PortalSidebars";
import type { UserRole } from "@/types/tenant";

export default async function PortalSidebarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!session.user.unionId) redirect(`/${locale}/app`);
  const tenant = getTenantContext(session.user.unionId);
  if (!tenant?.union.enabledModules.includes("portal")) {
    redirect(`/${locale}/app`);
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessPortal(roles)) redirect(`/${locale}/app`);
  return <PortalSidebars />;
}
