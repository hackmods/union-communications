import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PresidentConfiguration } from "@/components/hub/PresidentConfiguration";
import { canManageLocalModules } from "@/lib/tenant/access";
import { isPlatformAdminRole } from "@/lib/tenant/local-number-access";
import type { UserRole } from "@/types/tenant";

export default async function PresidentConfigurationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ unionId?: string }>;
}) {
  const { locale } = await params;
  const { unionId: queryUnionId } = await searchParams;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(`/${locale}/app/mfa`);
  // Stewards may open the page read-only; writers use canManageLocalModules in UI.
  const roles = (session.user.roles ?? []) as UserRole[];
  const canView =
    canManageLocalModules(roles) ||
    roles.some((r) =>
      ["local_steward", "local_exec", "union_admin", "platform_admin"].includes(
        r,
      ),
    );
  if (!canView) {
    redirect(`/${locale}/app`);
  }
  const initialUnionId =
    isPlatformAdminRole(roles) && queryUnionId?.trim()
      ? queryUnionId.trim()
      : null;
  return <PresidentConfiguration initialUnionId={initialUnionId} />;
}
