import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ReportsClient } from "@/components/hub/ReportsClient";
import { isElevatedGrievanceRole } from "@/lib/authorization/legacy-role-compat";
import type { UserRole } from "@/types/tenant";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(localeMfaRedirect(locale, "/app/reports"));
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!isElevatedGrievanceRole(roles)) {
    redirect(`/${locale}/app`);
  }
  return <ReportsClient />;
}
