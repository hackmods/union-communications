import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { NewGrievanceForm } from "@/components/grievance/NewGrievanceForm";

export default async function NewGrievancePage({
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

  return <NewGrievanceForm />;
}
