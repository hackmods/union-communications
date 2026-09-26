import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CheckinDetailView } from "@/components/checkins/CheckinDetailView";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import { canAccessCheckinsModule } from "@/lib/checkins/access";
import type { UserRole } from "@/types/tenant";

export default async function CheckinDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!sessionMfaOk(session)) {
    redirect(`/${locale}/app/mfa`);
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessCheckinsModule(roles)) {
    redirect(`/${locale}/app`);
  }

  if (!isSessionModuleEnabled(session, "checkins")) {
    return <ModuleDisabledPanel moduleId="checkins" roles={roles} />;
  }

  return <CheckinDetailView scheduleId={id} />;
}
