import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { SiteFeedbackForm } from "@/components/feedback/SiteFeedbackForm";
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
    <PageShell size="nestedFocus" as="article">
      <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-3 max-w-prose text-gray-700">{t("lead")}</p>
      <div className="mt-8">
        <SiteFeedbackForm
          variant="hub"
          defaultEmail={session.user.email ?? undefined}
          defaultName={session.user.name ?? undefined}
          memoryBackend={isFeedbackMemoryBackend()}
        />
      </div>
    </PageShell>
  );
}
