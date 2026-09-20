import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { BylawsBoard } from "@/components/hub/bylaws/BylawsBoard";
import { canAccessBylawsModule } from "@/lib/hub-governance/access";
import type { UserRole } from "@/types/tenant";

export default async function HubBylawsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(`/${locale}/app/mfa`);
  if (!session.user.unionId) redirect(`/${locale}/app`);
  await hydrateTenantOverlayFromPostgres();
  const tenant = getTenantContext(session.user.unionId, session.user.localId);
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessBylawsModule(roles, tenant?.union.enabledModules ?? [])) {
    redirect(`/${locale}/app`);
  }
  return <BylawsBoard />;
}