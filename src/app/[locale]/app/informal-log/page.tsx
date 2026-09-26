import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { InformalLogBoard } from "@/components/hub/InformalLogBoard";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { canAccessInformalLogModule } from "@/lib/informal-log/access";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import type { UserRole } from "@/types/tenant";

export default async function InformalLogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(`/${locale}/app/mfa`);

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessInformalLogModule(roles)) redirect(`/${locale}/app`);

  if (!isSessionModuleEnabled(session, "informalLog")) {
    return <ModuleDisabledPanel moduleId="informalLog" roles={roles} />;
  }

  return <InformalLogBoard />;
}
