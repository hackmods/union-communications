import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { OverdueDashboard } from "@/components/qol/OverdueDashboard";

export default async function OverduePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!session.user.mfaVerified) redirect(`/${locale}/app/mfa`);
  return <OverdueDashboard />;
}
