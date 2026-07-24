import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { OfficerRosterBoard } from "@/components/hub/OfficerRosterBoard";
import { canAccessOfficerRoster } from "@/lib/officers/access";
import type { UserRole } from "@/types/tenant";

export default async function OfficersPage({
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
  if (!canAccessOfficerRoster(roles)) {
    redirect(`/${locale}/app`);
  }
  return <OfficerRosterBoard />;
}
