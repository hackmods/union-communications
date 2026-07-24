import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

/** Alias for the tenant onboarding wizard. */
export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(`/${locale}/app/onboarding`);
}
