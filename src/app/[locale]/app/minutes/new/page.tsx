import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MinutesCreateForm } from "@/components/hub/MinutesCreateForm";
import {
  canAccessMinutesModule,
  canWriteMinutes,
} from "@/lib/minutes/access";
import type { UserRole } from "@/types/tenant";

export default async function NewMinutesPage({
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
  if (!canAccessMinutesModule(roles) || !canWriteMinutes(roles)) {
    redirect(`/${locale}/app/minutes`);
  }

  return <MinutesCreateForm />;
}
