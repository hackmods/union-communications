import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { StewardGuidesHubBoard } from "@/components/hub/StewardGuidesHubBoard";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import { canAccessGrievanceModule } from "@/lib/grievance/access";
import type { UserRole } from "@/types/tenant";

export default async function StewardGuidesPage({
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
  if (!canAccessGrievanceModule(roles)) redirect(`/${locale}/app`);
  if (!isSessionModuleEnabled(session, "grievance")) {
    return <ModuleDisabledPanel moduleId="grievance" roles={roles} />;
  }

  return <StewardGuidesHubBoard />;
}
