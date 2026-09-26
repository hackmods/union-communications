import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { canAccessBumpingModule, canWriteBumping } from "@/lib/bumping/access";
import { isBumpingModuleEnabled } from "@/lib/auth/bumping-session";
import { BumpingCaseDetail } from "@/components/bumping/BumpingCaseDetail";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import type { UserRole } from "@/types/tenant";

export default async function BumpingCasePage({
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
  if (!canAccessBumpingModule(roles)) {
    redirect(`/${locale}/app`);
  }
  if (!isBumpingModuleEnabled(session)) {
    return <ModuleDisabledPanel moduleId="bumping" roles={roles} />;
  }

  const canWrite = canWriteBumping(roles);

  return <BumpingCaseDetail id={id} canWrite={canWrite} />;
}
