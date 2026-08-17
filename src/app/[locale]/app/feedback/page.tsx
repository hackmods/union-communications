import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { canReadSiteFeedbackInbox } from "@/lib/platform-feedback/access";
import { SiteFeedbackInbox } from "@/components/platform/SiteFeedbackInbox";
import { isFeedbackMemoryBackend } from "@/lib/platform-feedback/durable";
import type { UserRole } from "@/types/tenant";

export default async function SiteFeedbackInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(`/${locale}/app/mfa`);
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canReadSiteFeedbackInbox(roles)) {
    redirect(`/${locale}/app`);
  }

  return <SiteFeedbackInbox memoryBackend={isFeedbackMemoryBackend()} />;
}
