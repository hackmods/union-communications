import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessPortal } from "@/lib/portal/access";
import { CircleWorkspace } from "@/components/portal/CircleWorkspace";
import type { UserRole } from "@/types/tenant";

export default async function PortalCirclePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!session.user.unionId) redirect(`/${locale}/app`);
  const tenant = getTenantContext(session.user.unionId);
  if (!tenant?.union.enabledModules.includes("portal")) {
    redirect(`/${locale}/app`);
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessPortal(roles)) redirect(`/${locale}/app`);
  return (
    <Suspense fallback={<p className="text-gray-600">Loading…</p>}>
      <CircleWorkspace circleId={id} roles={roles} />
    </Suspense>
  );
}
