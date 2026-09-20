import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteFeedbackForm } from "@/components/feedback/SiteFeedbackForm";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";
import { isFeedbackMemoryBackend } from "@/lib/platform-feedback/durable";

export default async function HubSendFeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(`/${locale}/app/mfa`);

  const t = await getTranslations("hub.sendFeedback");

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-3 max-w-prose text-gray-700">{t("lead")}</p>
      </header>
      <PublicHubPanel className="max-w-4xl p-5 sm:p-6">
        <SiteFeedbackForm
          variant="hub"
          defaultEmail={session.user.email ?? undefined}
          defaultName={session.user.name ?? undefined}
          memoryBackend={isFeedbackMemoryBackend()}
        />
      </PublicHubPanel>
    </div>
  );
}
