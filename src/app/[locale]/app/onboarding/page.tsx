import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TenantOnboardingWizard } from "@/components/hub/TenantOnboardingWizard";
import { canManageTenantOnboarding } from "@/lib/tenant/access";
import type { UserRole } from "@/types/tenant";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

export default async function TenantOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(localeMfaRedirect(locale, "/app/onboarding"));
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canManageTenantOnboarding(roles)) {
    redirect(`/${locale}/app`);
  }
  return <TenantOnboardingWizard />;
}
