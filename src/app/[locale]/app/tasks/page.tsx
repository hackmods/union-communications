import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { TaskBoard } from "@/components/hub/TaskBoard";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessTasksModule } from "@/lib/tasks/access";
import type { UserRole } from "@/types/tenant";

export default async function TasksPage({
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
  if (!canAccessTasksModule(roles)) redirect(`/${locale}/app`);

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  if (!tenant?.union.enabledModules.includes("tasks")) {
    redirect(`/${locale}/app`);
  }

  return <TaskBoard />;
}
