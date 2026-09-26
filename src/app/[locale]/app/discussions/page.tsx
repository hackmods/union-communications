import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DiscussionsList } from "@/components/discussions/DiscussionsList";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import { canAccessDiscussionsModule } from "@/lib/discussions/access";
import type { UserRole } from "@/types/tenant";

export default async function DiscussionsPage({
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
  if (!canAccessDiscussionsModule(roles)) {
    redirect(`/${locale}/app`);
  }

  if (!isSessionModuleEnabled(session, "discussions")) {
    return <ModuleDisabledPanel moduleId="discussions" roles={roles} />;
  }

  return <DiscussionsList />;
}
