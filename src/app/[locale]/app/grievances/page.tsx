import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { GrievanceDashboard } from "@/components/grievance/GrievanceDashboard";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessGrievanceModule } from "@/lib/grievance/access";
import type { UserRole } from "@/types/tenant";

export default async function GrievancesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!sessionMfaOk(session)) {
    redirect(`/${locale}/app/mfa`);
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessGrievanceModule(roles)) {
    redirect(`/${locale}/app`);
  }

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId, session.user.localId)
    : null;
  if (!tenant?.union.enabledModules.includes("grievance")) {
    return <ModuleDisabledPanel moduleId="grievance" roles={roles} />;
  }

  return <GrievanceDashboard />;
}
