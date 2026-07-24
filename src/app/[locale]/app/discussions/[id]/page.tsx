import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DiscussionThreadView } from "@/components/discussions/DiscussionThreadView";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessDiscussionsModule } from "@/lib/discussions/access";
import type { UserRole } from "@/types/tenant";

export default async function DiscussionThreadPage({
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
  if (!sessionMfaOk(session)) {
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

  return <DiscussionThreadView threadId={id} />;
}
