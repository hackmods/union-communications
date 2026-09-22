import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TimeDashboard } from "@/components/time/TimeDashboard";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { getTenantContext } from "@/lib/tenant/loader";
import type { UserRole } from "@/types/tenant";

export default async function TimePage({
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
  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  if (!tenant?.union.enabledModules.includes("time")) {
    return <ModuleDisabledPanel moduleId="time" roles={roles} />;
  }

  return <TimeDashboard />;
}
