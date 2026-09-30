import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ExpensesBoard } from "@/components/hub/ExpensesBoard";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import { canAccessExpensesModule } from "@/lib/expenses/access";
import type { UserRole } from "@/types/tenant";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(localeMfaRedirect(locale, "/app/expenses"));
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessExpensesModule(roles)) {
    redirect(`/${locale}/app`);
  }
  if (!isSessionModuleEnabled(session, "expenses")) {
    return <ModuleDisabledPanel moduleId="expenses" roles={roles} />;
  }
  return <ExpensesBoard />;
}
