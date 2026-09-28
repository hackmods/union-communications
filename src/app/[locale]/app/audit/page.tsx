import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuditLogClient } from "@/components/hub/AuditLogClient";
import type { UserRole } from "@/types/tenant";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

const AUDIT_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

export default async function AuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(localeMfaRedirect(locale, "/app/audit"));
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!roles.some((r) => AUDIT_ROLES.includes(r))) {
    redirect(`/${locale}/app`);
  }
  return <AuditLogClient />;
}
