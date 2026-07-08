import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { canWriteBumping } from "@/lib/bumping/access";
import { isBumpingModuleEnabled } from "@/lib/auth/bumping-session";
import { BumpingCaseDetail } from "@/components/bumping/BumpingCaseDetail";
import type { UserRole } from "@/types/tenant";

export default async function BumpingCasePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!session.user.mfaVerified) {
    redirect(`/${locale}/app/mfa`);
  }
  if (!isBumpingModuleEnabled(session)) {
    redirect(`/${locale}/app`);
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  const canWrite = canWriteBumping(roles);

  return <BumpingCaseDetail id={id} canWrite={canWrite} />;
}
