import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PollsBoard } from "@/components/hub/PollsBoard";
import { canAccessPollsModule } from "@/lib/polls/access";
import type { UserRole } from "@/types/tenant";

export default async function PollsPage({
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
  if (!canAccessPollsModule(roles)) {
    redirect(`/${locale}/app`);
  }
  return <PollsBoard />;
}
