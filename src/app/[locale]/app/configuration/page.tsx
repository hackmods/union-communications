import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PresidentConfiguration } from "@/components/hub/PresidentConfiguration";
import { canManageLocalModules } from "@/lib/tenant/access";
import type { UserRole } from "@/types/tenant";

export default async function PresidentConfigurationPage({
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
  if (!canManageLocalModules(roles)) {
    redirect(`/${locale}/app`);
  }
  return <PresidentConfiguration />;
}
