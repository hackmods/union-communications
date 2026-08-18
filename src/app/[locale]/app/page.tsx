import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HubDashboard } from "@/components/hub/HubDashboard";
import { signedInHomeHref } from "@/lib/portal/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { UserRole } from "@/types/tenant";

export default async function HubDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const roles = (session.user.roles ?? []) as UserRole[];
  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  if (signedInHomeHref(roles, tenant?.union.enabledModules) === "/portal") {
    redirect(`/${locale}/portal`);
  }
  return <HubDashboard />;
}
