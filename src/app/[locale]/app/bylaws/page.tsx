import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { BylawsBoard } from "@/components/hub/bylaws/BylawsBoard";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
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
  const modules = tenant?.union.enabledModules ?? [];
  // Role check with module forced on so module-off gets a panel, not a silent redirect.
  if (!canAccessBylawsModule(roles, ["bylaws"])) {
    redirect(`/${locale}/app`);
  }
  if (!modules.includes("bylaws")) {
    return <ModuleDisabledPanel moduleId="bylaws" roles={roles} />;
  }
  return <BylawsBoard />;
}
