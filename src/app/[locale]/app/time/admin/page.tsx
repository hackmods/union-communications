import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TimeDashboard } from "@/components/time/TimeDashboard";
import { canAdminTime } from "@/lib/time/access";
import type { UserRole } from "@/types/tenant";

export default async function TimeAdminPage({
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
  if (!canAdminTime(roles)) {
    redirect(`/${locale}/app/time`);
  }

  return <TimeDashboard isAdmin />;
}
