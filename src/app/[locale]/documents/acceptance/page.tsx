import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { DocumentAcceptance } from "@/components/public/DocumentAcceptance";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

export const dynamic = "force-dynamic";

export default async function DocumentAcceptancePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const [{ locale }, query, session] = await Promise.all([params, searchParams, auth()]);
  const fallback = `/${locale}/app`;
  const candidate = query.returnTo ?? fallback;
  const returnTo = candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith(`/${locale}/documents/acceptance`) ? candidate : fallback;
  if (!session?.user) redirect(`/${locale}/app/login?returnTo=${encodeURIComponent(`/${locale}/documents/acceptance?returnTo=${encodeURIComponent(returnTo)}`)}`);
  if (!sessionMfaOk(session)) redirect(localeMfaRedirect(locale, "/documents/acceptance"));
  return <DocumentAcceptance locale={locale} returnTo={returnTo} />;
}
