import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CalendarDashboard } from "@/components/hub/CalendarDashboard";
import { isBumpingModuleEnabled } from "@/lib/auth/bumping-session";
import { canAccessBumpingModule } from "@/lib/bumping/access";
import { canAccessGrievanceModule } from "@/lib/grievance/access";
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
  if (!session.user.mfaVerified) redirect(`/${locale}/app/mfa`);

  const roles = (session.user.roles ?? []) as UserRole[];
  const canRead =
    canAccessGrievanceModule(roles) ||
    (canAccessBumpingModule(roles) && isBumpingModuleEnabled(session));
  if (!canRead) redirect(`/${locale}/app`);

  return <CalendarDashboard />;
}
