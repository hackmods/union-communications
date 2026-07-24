import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MinutesDetail } from "@/components/hub/MinutesDetail";
import { canAccessMinutesModule } from "@/lib/minutes/access";
import type { UserRole } from "@/types/tenant";

export default async function MinutesDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!session.user.mfaVerified) redirect(`/${locale}/app/mfa`);

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessMinutesModule(roles)) redirect(`/${locale}/app`);

  return <MinutesDetail minutesId={id} />;
}
