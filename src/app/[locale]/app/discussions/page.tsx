import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DiscussionsList } from "@/components/discussions/DiscussionsList";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessDiscussionsModule } from "@/lib/discussions/access";
import type { UserRole } from "@/types/tenant";

export default async function DiscussionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!session.user.mfaVerified) {
    redirect(`/${locale}/app/mfa`);
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessDiscussionsModule(roles)) {
    redirect(`/${locale}/app`);
  }

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  if (!tenant?.union.enabledModules.includes("discussions")) {
    redirect(`/${locale}/app`);
  }

  return <DiscussionsList />;
}
