import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { GrievanceDashboard } from "@/components/grievance/GrievanceDashboard";

export default async function GrievancesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!session.user.mfaVerified) {
    redirect(`/${locale}/app/mfa`);
  }

  return <GrievanceDashboard />;
}
