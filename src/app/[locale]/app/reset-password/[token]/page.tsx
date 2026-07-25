import { setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "@/components/hub/ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <ResetPasswordForm token={token} />;
}
