import { setRequestLocale, getTranslations } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { PageShell } from "@/components/layout/PageShell";
import { SiteFeedbackForm } from "@/components/feedback/SiteFeedbackForm";
import { isFeedbackMemoryBackend } from "@/lib/platform-feedback/durable";

export default async function PortalSendFeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { session } = await requirePortalPage(locale);

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
