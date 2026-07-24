import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ReportsClient } from "@/components/hub/ReportsClient";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";
import type { UserRole } from "@/types/tenant";

export default async function ReportsPage({
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
  if (!isElevatedGrievanceRole(roles)) {
    redirect(`/${locale}/app`);
  }
  return <ReportsClient />;
}
