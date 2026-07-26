import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ExpensesBoard } from "@/components/hub/ExpensesBoard";
import { canAccessExpensesModule } from "@/lib/expenses/access";
import type { UserRole } from "@/types/tenant";

export default async function ExpensesPage({
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
  if (!canAccessExpensesModule(roles)) {
    redirect(`/${locale}/app`);
  }
  return <ExpensesBoard />;
}
