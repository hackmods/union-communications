import { setRequestLocale } from "next-intl/server";
import { AcceptInviteForm } from "@/components/hub/AcceptInviteForm";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <AcceptInviteForm token={token} />;
}
