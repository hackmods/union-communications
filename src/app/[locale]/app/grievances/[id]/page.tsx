import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { GrievanceDetail } from "@/components/grievance/GrievanceDetail";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import { canAccessGrievanceModule } from "@/lib/grievance/access";
import type { UserRole } from "@/types/tenant";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

export default async function GrievanceDetailPage({
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
    redirect(localeMfaRedirect(locale, `/app/grievances/${id}`));
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessGrievanceModule(roles)) {
    redirect(`/${locale}/app`);
  }
  if (!isSessionModuleEnabled(session, "grievance")) {
    return <ModuleDisabledPanel moduleId="grievance" roles={roles} />;
  }

  return <GrievanceDetail id={id} />;
}
