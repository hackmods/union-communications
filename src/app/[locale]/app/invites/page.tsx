import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { InvitesBoard } from "@/components/hub/InvitesBoard";
import { canManageInvites } from "@/lib/tenant/access";
import type { UserRole } from "@/types/tenant";

export default async function InvitesPage({
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
  if (!canManageInvites(roles)) {
    redirect(`/${locale}/app`);
  }
  return <InvitesBoard />;
}
