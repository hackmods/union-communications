import { setRequestLocale } from "next-intl/server";
import { AccessRequestsInbox } from "@/components/platform/AccessRequestsInbox";
import {
  redirectUnlessSiteAdmin,
  requireSiteAdminSession,
} from "@/lib/auth/site-admin-session";

export default async function AccessRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const result = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, result, "/app/site-admin/access-requests");
  return <AccessRequestsInbox />;
}
