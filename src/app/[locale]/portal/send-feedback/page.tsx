import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessPortal } from "@/lib/portal/access";
import { PageShell } from "@/components/layout/PageShell";
import { SiteFeedbackForm } from "@/components/feedback/SiteFeedbackForm";
import { isFeedbackMemoryBackend } from "@/lib/platform-feedback/durable";
import type { UserRole } from "@/types/tenant";

export default async function PortalSendFeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!session.user.unionId) redirect(`/${locale}/app`);
  const tenant = getTenantContext(session.user.unionId);
  if (!tenant?.union.enabledModules.includes("portal")) {
    redirect(`/${locale}/app`);
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessPortal(roles)) redirect(`/${locale}/app`);

  const t = await getTranslations("portal");

  return (
    <PageShell size="nestedFocus" as="article">
      <h1 className="text-2xl font-bold text-opseu-dark">
        {t("sendFeedbackTitle")}
      </h1>
      <p className="mt-3 max-w-prose text-gray-700">{t("sendFeedbackLead")}</p>
      <div className="mt-8">
        <SiteFeedbackForm
          variant="portal"
          defaultEmail={session.user.email ?? undefined}
          defaultName={session.user.name ?? undefined}
          memoryBackend={isFeedbackMemoryBackend()}
        />
      </div>
    </PageShell>
  );
}
