import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CalendarDashboard } from "@/components/hub/CalendarDashboard";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { isBumpingModuleEnabled } from "@/lib/auth/bumping-session";
import { canAccessBumpingModule } from "@/lib/bumping/access";
import { canAccessGrievanceModule } from "@/lib/grievance/access";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import type { UserRole } from "@/types/tenant";

export default async function CalendarPage({
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
  const grievanceRole = canAccessGrievanceModule(roles);
  const bumpingRole = canAccessBumpingModule(roles);
  if (!grievanceRole && !bumpingRole) redirect(`/${locale}/app`);

  const grievanceOn = isSessionModuleEnabled(session, "grievance");
  const bumpingOn = isBumpingModuleEnabled(session);
  if (!grievanceOn && !bumpingOn) {
    // Prefer the module the officer would normally open from casework.
    const panelId = grievanceRole ? "grievance" : "bumping";
    return <ModuleDisabledPanel moduleId={panelId} roles={roles} />;
  }

  const canRead =
    (grievanceRole && grievanceOn) || (bumpingRole && bumpingOn);
  if (!canRead) redirect(`/${locale}/app`);

  return <CalendarDashboard />;
}
