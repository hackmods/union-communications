import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MinutesDetail } from "@/components/hub/MinutesDetail";
import { canAccessMinutesModule } from "@/lib/minutes/access";
import type { UserRole } from "@/types/tenant";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

export default async function MinutesDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(localeMfaRedirect(locale, `/app/minutes/${id}`));

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessMinutesModule(roles)) redirect(`/${locale}/app`);

  return <MinutesDetail minutesId={id} />;
}
