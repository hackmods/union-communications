import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CommitteesBoard } from "@/components/hub/CommitteesBoard";
import { canAccessCommitteesModule } from "@/lib/committees/access";
import type { UserRole } from "@/types/tenant";

export default async function CommitteesPage({
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
  if (!canAccessCommitteesModule(roles)) {
    redirect(`/${locale}/app`);
  }
  return <CommitteesBoard />;
}
