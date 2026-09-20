import { setRequestLocale, getTranslations } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { SiteFeedbackForm } from "@/components/feedback/SiteFeedbackForm";
import { PortalPanel } from "@/components/portal/PortalPanel";
import { isFeedbackMemoryBackend } from "@/lib/platform-feedback/durable";
import { Link } from "@/i18n/navigation";

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
    <PortalPanel
      eyebrow={t("portalEyebrow")}
      title={t("sendFeedbackTitle")}
      titleId="portal-feedback-heading"
      titleLevel="page"
      lead={t("sendFeedbackLead")}
      breadcrumb={
        <Link
          href="/portal"
          className="font-medium text-opseu-blue underline-offset-2 hover:underline"
        >
          {t("stationTitle")}
        </Link>
      }
    >
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <SiteFeedbackForm
          variant="portal"
          defaultEmail={session.user.email ?? undefined}
          defaultName={session.user.name ?? undefined}
          memoryBackend={isFeedbackMemoryBackend()}
        />
      </div>
    </PortalPanel>
  );
}
